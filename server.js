import express from "express";
import { GoogleGenAI } from "@google/genai";
import { MAX_FEEDBACK_CHARS } from "./limits.js";

const app = express();
// Render sits behind a proxy — without this, every request shares one IP
// and the rate limiter would punish everyone for one heavy user.
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

// In production the same server hosts the built React app from dist/
app.use(express.static(`${import.meta.dirname}/dist`));

// Reads GEMINI_API_KEY from the environment — the key never reaches the browser.
// Free key, no card needed: https://aistudio.google.com/apikey
// Real keys are ~39 chars; this also catches the "AIza..." placeholder from .env.example.
const HAS_KEY = (process.env.GEMINI_API_KEY ?? "").length > 20;
const ai = HAS_KEY ? new GoogleGenAI({}) : null;

const MOCK_AI = process.env.MOCK_AI === "1";

// The shape agreed in CONTRACT.md. Structured outputs make the API
// guarantee the response parses against this schema.
const REPORT_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "2-3 sentences a busy product manager can read in ten seconds. Plain English.",
    },
    items_analysed: {
      type: "integer",
      description: "How many distinct pieces of feedback were counted.",
    },
    overall_sentiment: {
      type: "string",
      enum: ["positive", "negative", "mixed"],
    },
    themes: {
      type: "array",
      description:
        "3 to 6 themes, ranked by how much customers care. Rank 1 first.",
      items: {
        type: "object",
        properties: {
          rank: { type: "integer", description: "1 = customers care most." },
          title: {
            type: "string",
            description:
              "Short and specific, e.g. 'Checkout fails on mobile' — never vague like 'App issues'.",
          },
          sentiment: {
            type: "string",
            enum: ["positive", "negative", "mixed"],
          },
          frequency: {
            type: "integer",
            description: "1-5 scale of how often the theme shows up. 5 = constantly.",
          },
          mentions: {
            type: "string",
            description: "Rough human-readable count, e.g. 'roughly 18 of 47 items'.",
          },
          quotes: {
            type: "array",
            description:
              "2 to 4 genuine quotes lifted from the input feedback, the most representative first. Never invented.",
            items: { type: "string" },
          },
          action: {
            type: "string",
            description:
              "One concrete next step a product or customer-success team could actually take.",
          },
        },
        required: [
          "rank",
          "title",
          "sentiment",
          "frequency",
          "mentions",
          "quotes",
          "action",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "items_analysed", "overall_sentiment", "themes"],
  additionalProperties: false,
};

const MOCK_REPORT = {
  summary:
    "MOCK MODE — no API call was made. Customers love the product itself but are losing patience with how it reaches them.",
  items_analysed: 47,
  overall_sentiment: "mixed",
  themes: [
    {
      rank: 1,
      title: "Deliveries arrive later than promised",
      sentiment: "negative",
      frequency: 5,
      mentions: "roughly 19 of 47 items",
      quotes: [
        "Ordered with express shipping and it still took eleven days. No updates, nothing.",
        "The delivery estimate changed from 3 days to 12 days at checkout. Almost cancelled.",
        "Beautiful product, awful wait. 11 days and the tracking link never worked once.",
      ],
      action:
        "Audit the courier SLA and add proactive delay emails before customers have to ask.",
    },
    {
      rank: 2,
      title: "Support emails go unanswered",
      sentiment: "negative",
      frequency: 4,
      mentions: "roughly 12 of 47 items",
      quotes: [
        "I've emailed support three times in two weeks and heard absolutely nothing back.",
        "Emailed about a damaged box, heard nothing. Product 10/10, support 2/10.",
      ],
      action:
        "Set a 24-hour first-response target and an auto-acknowledgement so no ticket feels ignored.",
    },
    {
      rank: 3,
      title: "Product quality consistently praised",
      sentiment: "positive",
      frequency: 4,
      mentions: "roughly 14 of 47 items",
      quotes: [
        "The build quality genuinely surprised me — feels twice the price.",
        "My last one from a competitor cracked in a month; this feels like it'll last years.",
      ],
      action:
        "Feature real quality reviews on the product page; it is the strongest counterweight to delivery complaints.",
    },
  ],
};

// Overloaded or rate-limited — the two upstream states worth retrying elsewhere.
const isBusy = (err) => err?.status === 503 || err?.status === 429;

// Free-tier capacity comes and goes per model — walk down this list until
// one answers. Best model first.
const MODELS = [
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

async function callModel(prompt) {
  let lastErr;
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: REPORT_SCHEMA,
        },
      });
      return JSON.parse(response.text);
    } catch (err) {
      lastErr = err;
      // Busy or rate-limited — fall through to the next model.
      if (isBusy(err)) {
        console.warn(`${model} unavailable (${err.status}), trying next model`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

const analysePrompt = (feedback) => `You are a customer-insight analyst. Read the customer feedback below and produce a one-page insights report following the schema.

Guidance:
- Cluster genuinely related complaints into one theme; don't split hairs or pad the list.
- Rank by how much customers care: weigh how often a theme appears and how strongly people feel about it.
- Quotes must be real quotes from the feedback (light trimming is fine, no invention). Give 2-4 per theme, the most representative first.
- Actions must be specific enough to put on a roadmap, not "improve communication".

FEEDBACK:
${feedback}`;

const mergePrompt = (partials, totalItems) => `You are a customer-insight analyst. A feedback batch was too large to read in one sitting, so it was analysed in ${partials.length} parts. Below are the ${partials.length} partial reports as JSON.

Merge them into ONE final report following the same schema:
- Combine themes that describe the same underlying issue, even if worded differently.
- Re-rank by impact across the WHOLE batch: a theme that tops every partial report outranks one that tops only one.
- Keep only genuine quotes lifted from the partial reports — never invent.
- "mentions" should talk about the whole batch of ${totalItems} items.
- The summary should read as if you read everything yourself; never mention parts or partial reports.

PARTIAL REPORTS:
${JSON.stringify(partials, null, 2)}`;

// One call comfortably handles most pastes. Beyond this, split on line
// boundaries, analyse each piece, then merge — map-reduce for feedback.
const CHUNK_CHARS = 80_000;

function splitIntoChunks(text) {
  // A little over the line is cheaper as one call than as two.
  if (text.length <= CHUNK_CHARS * 1.25) return [text];
  const chunks = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current && current.length + line.length + 1 > CHUNK_CHARS) {
      chunks.push(current);
      current = "";
    }
    current += (current ? "\n" : "") + line;
  }
  if (current) chunks.push(current);
  return chunks;
}

// Schemas can't enforce numeric ranges or rank order — tidy both.
function finishReport(report) {
  report.themes ??= [];
  report.themes.sort((a, b) => a.rank - b.rank);
  report.themes.forEach((theme, i) => {
    theme.rank = i + 1;
    theme.frequency = Math.min(5, Math.max(1, Math.round(theme.frequency)));
  });
  return report;
}

async function generateReport(feedback) {
  const chunks = splitIntoChunks(feedback);
  if (chunks.length === 1) {
    return finishReport(await callModel(analysePrompt(feedback)));
  }

  // Sequential on purpose: parallel calls trip the free tier's per-minute cap.
  const partials = [];
  for (const [i, chunk] of chunks.entries()) {
    console.log(`chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    partials.push(await callModel(analysePrompt(chunk)));
  }

  const totalItems = partials.reduce((n, p) => n + (p.items_analysed ?? 0), 0);
  const merged = await callModel(mergePrompt(partials, totalItems));
  // The count is arithmetic, not judgement — don't let the merge model guess it.
  merged.items_analysed = totalItems;
  return finishReport(merged);
}

// The Gemini key is a free-tier key with a daily quota — a public endpoint
// with no brakes would let one visitor burn the whole allowance. Sliding
// window per IP, plus a global daily ceiling as the backstop.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const MAX_PER_DAY_GLOBAL = 150;

const hitsByIp = new Map();
let dailyCount = 0;
let dailyCountDate = new Date().toDateString();

function rateLimited(ip) {
  const now = Date.now();

  const today = new Date().toDateString();
  if (today !== dailyCountDate) {
    dailyCountDate = today;
    dailyCount = 0;
  }
  if (dailyCount >= MAX_PER_DAY_GLOBAL) return "day";

  const recent = (hitsByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hitsByIp.set(ip, recent);
    return "window";
  }

  recent.push(now);
  hitsByIp.set(ip, recent);
  dailyCount += 1;

  // Don't let the map grow forever on a long-running server.
  if (hitsByIp.size > 5000) {
    for (const [key, times] of hitsByIp) {
      if (times.every((t) => now - t >= WINDOW_MS)) hitsByIp.delete(key);
    }
  }
  return null;
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/analyze", async (req, res) => {
  const feedback = (req.body?.feedback ?? "").trim();
  if (!feedback) {
    return res.status(400).json({ error: "No feedback provided." });
  }
  if (feedback.length > MAX_FEEDBACK_CHARS) {
    return res.status(413).json({
      error: `That's ${feedback.length.toLocaleString()} characters — the limit is ${MAX_FEEDBACK_CHARS.toLocaleString()}. Trim the input and try again.`,
    });
  }

  const limited = rateLimited(req.ip);
  if (limited === "window") {
    return res.status(429).json({
      error: "Too many analyses in a short burst — wait a few minutes and try again.",
    });
  }
  if (limited === "day") {
    return res.status(429).json({
      error: "The engine has hit its free-tier budget for today. Come back tomorrow.",
    });
  }

  if (MOCK_AI) {
    return res.json({ report: MOCK_REPORT });
  }

  if (!HAS_KEY) {
    return res.status(503).json({
      error:
        "GEMINI_API_KEY is missing or still the placeholder. Grab a free one at aistudio.google.com/apikey and paste the full key into .env (local) or the Render dashboard (production).",
    });
  }

  try {
    res.json({ report: await generateReport(feedback) });
  } catch (err) {
    console.error(err);
    if (isBusy(err)) {
      return res.status(503).json({
        error:
          "Every free-tier model is busy or rate-limited right now — wait a minute and try again.",
      });
    }
    // Surface the real upstream reason so failures are debuggable from the UI.
    const detail = (err?.message ?? "").slice(0, 200);
    res.status(502).json({
      error: `The analysis call failed${detail ? `: ${detail}` : ". Try again."}`,
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on ${PORT}`));

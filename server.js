import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "1mb" }));

// In production the same server hosts the built React app from dist/
app.use(express.static(path.join(__dirname, "dist")));

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
          example: {
            type: "string",
            description:
              "A genuine representative quote lifted from the input feedback.",
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
          "example",
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
      example:
        "Ordered with express shipping and it still took eleven days. No updates, nothing.",
      action:
        "Audit the courier SLA and add proactive delay emails before customers have to ask.",
    },
    {
      rank: 2,
      title: "Support emails go unanswered",
      sentiment: "negative",
      frequency: 4,
      mentions: "roughly 12 of 47 items",
      example:
        "I've emailed support three times in two weeks and heard absolutely nothing back.",
      action:
        "Set a 24-hour first-response target and an auto-acknowledgement so no ticket feels ignored.",
    },
    {
      rank: 3,
      title: "Product quality consistently praised",
      sentiment: "positive",
      frequency: 4,
      mentions: "roughly 14 of 47 items",
      example:
        "The build quality genuinely surprised me — feels twice the price.",
      action:
        "Feature real quality reviews on the product page; it is the strongest counterweight to delivery complaints.",
    },
  ],
};

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/analyze", async (req, res) => {
  const feedback = (req.body?.feedback ?? "").trim();
  if (!feedback) {
    return res.status(400).json({ error: "No feedback provided." });
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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are a customer-insight analyst. Read the customer feedback below and produce a one-page insights report following the schema.

Guidance:
- Cluster genuinely related complaints into one theme; don't split hairs or pad the list.
- Rank by how much customers care: weigh how often a theme appears and how strongly people feel about it.
- The example must be a real quote from the feedback (light trimming is fine, no invention).
- Actions must be specific enough to put on a roadmap, not "improve communication".

FEEDBACK:
${feedback}`,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: REPORT_SCHEMA,
      },
    });

    res.json({ report: JSON.parse(response.text) });
  } catch (err) {
    console.error(err);
    if (err?.status === 429) {
      return res.status(429).json({
        error:
          "The free tier is rate-limited — wait a minute and try again.",
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

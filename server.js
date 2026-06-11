import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Reads ANTHROPIC_API_KEY from the environment — the key never reaches the browser.
const anthropic = new Anthropic();

const MOCK_AI = process.env.MOCK_AI === "1";

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/analyze", async (req, res) => {
  const feedback = (req.body?.feedback ?? "").trim();
  if (!feedback) {
    return res.status(400).json({ error: "No feedback provided." });
  }

  if (MOCK_AI) {
    return res.json({
      raw: "MOCK MODE — no API call made.\n\nTop themes:\n1. Deliveries arrive late (negative, ~19 mentions)\n2. Support emails unanswered (negative, ~12 mentions)\n3. Product quality praised (positive, ~14 mentions)",
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error:
        "Server is missing its ANTHROPIC_API_KEY. Set it in .env (local) or the Render dashboard (production).",
    });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: `You are a customer-insight analyst. Read the customer feedback below and produce a one-page report: the top themes, the sentiment behind each, roughly how often each shows up, one representative quote, and a suggested action per theme. Rank themes by how much customers care.\n\nFEEDBACK:\n${feedback}`,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    res.json({ raw: text });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "The analysis call failed. Try again." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on ${PORT}`));

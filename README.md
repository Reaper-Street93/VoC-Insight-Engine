# Voice-of-Customer Insight Engine

Paste a pile of customer reviews, support tickets or survey responses and get
back a one-page insights report: the top themes, the sentiment behind each,
roughly how often each shows up, a real customer quote, and a suggested action
— ranked by what customers actually care about.

Think of a research assistant who reads 500 reviews overnight and hands you a
single page saying *"here are the five things that matter, in order."*

## Why it exists

Raw feedback is noisy and nobody has time to read it. Translating the voice of
the customer into something a product or business team can act on is the core
of customer-facing analysis work — this tool automates the reading so a human
can spend their time on the deciding.

## How it works

1. **Frontend (React + Tailwind)** — a single page: paste feedback, hit
   analyse, read the report. State handled with `useState`, the API call with
   `async/await` + `fetch`.
2. **Backend (Node + Express)** — one endpoint, `POST /api/analyze`. It holds
   the API key (which must never reach the browser) and asks Gemini to
   cluster the feedback into ranked themes. The Gemini free tier means the
   whole project runs at £0.
3. **Structured outputs** — the model answers against a JSON schema that
   mirrors [CONTRACT.md](CONTRACT.md), so the response is guaranteed to parse.
   No regex, no hoping.

## The build, step by step

The commit history *is* the project diary — each step was committed as it
happened:

1. **Agree the contract first** — `CONTRACT.md` pinned down the exact input
   and output shape before a line of code existed.
2. **Build the empty shell** — React, Tailwind, a hardcoded fake report, zero
   AI. Layout and styling settled early.
3. **Wire the AI** — Express server + an async `fetch` from the frontend,
   dumping the raw model answer on screen.
4. **Make the output structured** — JSON schema enforcement, parsed and
   rendered as a typeset report.
5. **Polish for the demo** — loading state, error handling, and a one-click
   "try it with sample data" button.

## Run it locally

Requires Node 22+.

```bash
npm install
cp .env.example .env   # add your free GEMINI_API_KEY (aistudio.google.com/apikey)

npm start              # API on :3001
npm run dev            # frontend on :5173 (proxies /api to :3001)
```

No API key yet? Set `MOCK_AI=1` in `.env` and the server returns a canned
report so the full flow still works.

## Run it in production

```bash
npm run build && npm start
```

One process serves both the built frontend and the API. `render.yaml` is a
ready-made [Render](https://render.com) blueprint — connect the repo, set
`GEMINI_API_KEY` in the dashboard, done.

## Design

Swiss-editorial, on purpose: the output is literally a one-page report, so the
UI reads like a typeset research memo — paper background, ink type, hairline
rules, numbered findings and a single signal-red accent. Space Grotesk for
text, IBM Plex Mono for labels and data.

## Stack

React 19 · Vite · Tailwind CSS 4 · Node/Express 5 · Gemini API
(gemini-3.5-flash free tier, structured outputs) · Render

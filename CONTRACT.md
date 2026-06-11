# The Contract — agreed before any code

This document pins down exactly what goes into the Voice-of-Customer Insight
Engine and exactly what comes out. Nothing gets built until this shape is
agreed — the same way a spec gets signed off before engineering starts.

## What goes in

One blob of pasted text containing customer feedback. It can be messy:

- App store / product reviews
- Support tickets
- Survey free-text answers
- Any mix of the above, separated however the user pasted them

No formatting requirements. Real feedback is messy; the engine deals with it.

## What comes out

A single one-page insights report, as JSON in this exact shape:

```json
{
  "summary": "Two or three sentences a busy product manager can read in ten seconds.",
  "items_analysed": 47,
  "overall_sentiment": "negative",
  "themes": [
    {
      "rank": 1,
      "title": "Short, specific theme name",
      "sentiment": "negative",
      "frequency": 4,
      "mentions": "roughly 18 of 47 items",
      "example": "A real quote lifted from the feedback that typifies this theme.",
      "action": "One concrete, specific thing the business should do about it."
    }
  ]
}
```

Field rules:

| Field | Type | Rules |
|---|---|---|
| `summary` | string | 2–3 sentences, plain English, no jargon |
| `items_analysed` | integer | How many distinct pieces of feedback the model counted |
| `overall_sentiment` | string | One of `positive`, `negative`, `mixed` |
| `themes` | array | 3–6 themes, ranked by how much customers care, rank 1 first |
| `themes[].rank` | integer | 1 = the thing customers care about most |
| `themes[].title` | string | Specific ("Checkout fails on mobile"), never vague ("App issues") |
| `themes[].sentiment` | string | One of `positive`, `negative`, `mixed` |
| `themes[].frequency` | integer | 1–5 scale: how often this theme showed up |
| `themes[].mentions` | string | Human-readable rough count, e.g. "roughly 18 of 47 items" |
| `themes[].example` | string | A genuine representative quote from the input |
| `themes[].action` | string | A suggested next step a product/CS team could actually take |

## Why this shape

- **Ranked list, not a wall of text** — the whole point is "the five things that
  matter, in order".
- **Sentiment per theme, not just overall** — "shipping" can be a positive theme
  and "pricing" a negative one in the same dataset.
- **An example quote per theme** — keeps the report honest. Anyone reading it
  can see the customer's actual words, not just the machine's summary.
- **A suggested action per theme** — turns a research artefact into something a
  team can put on a roadmap. This is the translation step: customer voice in,
  business action out.

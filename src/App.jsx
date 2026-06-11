import { useState } from "react";
import ReportView from "./ReportView.jsx";

// Hardcoded fake report so the layout can be built and styled
// before any AI is wired in. Shape matches CONTRACT.md exactly.
const FAKE_REPORT = {
  summary:
    "Customers love the product itself but are losing patience with how it reaches them. Delivery delays and unanswered support emails dominate the negative feedback, while the quality of the product keeps ratings from collapsing.",
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
      example: "The build quality genuinely surprised me — feels twice the price.",
      action:
        "Feature real quality reviews on the product page; it is the strongest counterweight to delivery complaints.",
    },
  ],
};

export default function App() {
  const [feedback, setFeedback] = useState("");
  const [report, setReport] = useState(null);

  function handleAnalyse() {
    setReport(FAKE_REPORT);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-14">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60">
          Voice of Customer
        </p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight">
          Insight Engine<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-xl text-ink/70">
          Paste a pile of reviews, tickets or survey answers. Get back a
          one-page report: the themes that matter, the sentiment behind each,
          and what to do about them — in order.
        </p>
      </header>

      <section>
        <label
          htmlFor="feedback"
          className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60"
        >
          01 — Input
        </label>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Paste customer feedback here — reviews, tickets, survey responses, any mix…"
          rows={10}
          className="mt-3 w-full resize-y border border-ink/20 bg-white p-4 text-sm leading-relaxed outline-none placeholder:text-ink/30 focus:border-ink"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-xs text-ink/40">
            {feedback.length.toLocaleString()} characters
          </span>
          <button
            onClick={handleAnalyse}
            className="bg-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] text-paper transition-colors hover:bg-signal"
          >
            Analyse feedback →
          </button>
        </div>
      </section>

      {report && (
        <section className="mt-16">
          <div className="border-t border-ink pt-3">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60">
              02 — Report
            </p>
          </div>
          <ReportView report={report} />
        </section>
      )}

      <footer className="mt-24 border-t border-rule pt-4">
        <p className="font-mono text-xs text-ink/40">
          Built by Sebastian Barclay — feedback in, decisions out.
        </p>
      </footer>
    </div>
  );
}

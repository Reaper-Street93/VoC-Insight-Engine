import { useState } from "react";
import ReportView from "./ReportView.jsx";
import { SAMPLE_FEEDBACK } from "./sampleData.js";

export default function App() {
  const [feedback, setFeedback] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function analyse(text) {
    if (!text.trim()) {
      setError("Paste some feedback first — or load the sample data.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.report) {
        throw new Error(data.error || "Something went wrong. Try again.");
      }
      setReport(data.report);
    } catch (err) {
      setError(err.message || "Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSample() {
    setFeedback(SAMPLE_FEEDBACK);
    analyse(SAMPLE_FEEDBACK);
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
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="feedback"
            className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60"
          >
            01 — Input
          </label>
          <button
            onClick={handleSample}
            disabled={loading}
            className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60 underline decoration-rule underline-offset-4 transition-colors hover:text-signal disabled:opacity-40"
          >
            Try it with sample data
          </button>
        </div>
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
            onClick={() => analyse(feedback)}
            disabled={loading}
            className="bg-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] text-paper transition-colors hover:bg-signal disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Analysing…" : "Analyse feedback →"}
          </button>
        </div>
        {error && (
          <p className="mt-4 border-l-2 border-signal pl-3 font-mono text-xs text-signal">
            {error}
          </p>
        )}
      </section>

      {loading && (
        <section className="mt-16" aria-live="polite">
          <div className="border-t border-ink pt-3">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60">
              02 — Report
            </p>
          </div>
          <div className="mt-8 space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">
              <span className="inline-block h-3 w-3 animate-pulse bg-signal align-baseline" />{" "}
              Reading every piece of feedback…
            </p>
            <div className="h-4 w-3/4 animate-pulse bg-rule" />
            <div className="h-4 w-2/3 animate-pulse bg-rule" />
            <div className="h-4 w-1/2 animate-pulse bg-rule" />
          </div>
        </section>
      )}

      {report && !loading && (
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

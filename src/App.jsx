import { useState } from "react";

export default function App() {
  const [feedback, setFeedback] = useState("");
  const [raw, setRaw] = useState(null);

  async function handleAnalyse() {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    });
    const data = await res.json();
    setRaw(data.raw ?? data.error);
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

      {raw && (
        <section className="mt-16">
          <div className="border-t border-ink pt-3">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60">
              02 — Report
            </p>
          </div>
          {/* Raw dump for now — structured rendering comes next */}
          <pre className="mt-6 whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink/80">
            {raw}
          </pre>
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

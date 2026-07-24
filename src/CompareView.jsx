import { SentimentTag, FrequencyMeter } from "./ReportView.jsx";

export function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Two reports side by side — the honest version of "what changed since
// last month": same layout for both, reader draws the comparison.
export default function CompareView({ a, b }) {
  return (
    <div className="mt-8 grid gap-12 sm:grid-cols-2">
      {[a, b].map((entry, i) => (
        <div key={entry.id}>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-signal">
            {i === 0 ? "A" : "B"} — {formatWhen(entry.at)}
          </p>
          <p className="mt-2 font-mono text-xs text-ink/60">
            {entry.report.items_analysed} items · Overall:{" "}
            <SentimentTag sentiment={entry.report.overall_sentiment} />
          </p>
          <p className="mt-4 text-sm leading-relaxed text-ink/80">
            {entry.report.summary}
          </p>

          <div className="mt-6">
            {entry.report.themes.map((theme) => (
              <div key={theme.rank} className="border-t border-rule py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold tracking-tight">
                    <span className="mr-2 font-mono font-medium text-signal">
                      {String(theme.rank).padStart(2, "0")}
                    </span>
                    {theme.title}
                  </p>
                  <SentimentTag sentiment={theme.sentiment} />
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <FrequencyMeter value={theme.frequency} />
                  <span className="font-mono text-xs text-ink/50">
                    {theme.mentions}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

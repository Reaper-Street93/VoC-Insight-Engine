import { useState } from "react";

const SENTIMENT_COLOURS = {
  positive: "text-emerald-700 dark:text-emerald-400",
  negative: "text-signal",
  mixed: "text-amber-700 dark:text-amber-400",
};

export function SentimentTag({ sentiment }) {
  return (
    <span
      className={`font-mono text-xs uppercase tracking-[0.2em] ${
        SENTIMENT_COLOURS[sentiment] ?? "text-ink/60"
      }`}
    >
      ● {sentiment}
    </span>
  );
}

export function FrequencyMeter({ value }) {
  return (
    <span className="flex gap-1" title={`Frequency ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-3 w-3 ${i <= value ? "bg-ink" : "bg-rule"}`}
        />
      ))}
    </span>
  );
}

function ThemeCard({ theme }) {
  const [showEvidence, setShowEvidence] = useState(false);
  // Reports saved before the contract grew `quotes` carried one `example`.
  const quotes = theme.quotes ?? (theme.example ? [theme.example] : []);
  const [lead, ...evidence] = quotes;

  return (
    <article className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-rule py-8">
      <span className="font-mono text-3xl font-medium text-signal">
        {String(theme.rank).padStart(2, "0")}
      </span>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{theme.title}</h2>
          <SentimentTag sentiment={theme.sentiment} />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <FrequencyMeter value={theme.frequency} />
          <span className="font-mono text-xs text-ink/50">
            {theme.mentions}
          </span>
        </div>

        {lead && (
          <blockquote className="mt-5 border-l-2 border-ink/20 pl-4 text-ink/70">
            “{lead}”
          </blockquote>
        )}

        {evidence.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              aria-expanded={showEvidence}
              className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50 underline decoration-rule underline-offset-4 transition-colors hover:text-signal print:hidden"
            >
              {showEvidence
                ? "Hide the evidence"
                : `Show the evidence — ${evidence.length} more ${
                    evidence.length === 1 ? "quote" : "quotes"
                  }`}
            </button>
            {showEvidence && (
              <div className="mt-3 space-y-3">
                {evidence.map((quote, i) => (
                  <blockquote
                    key={i}
                    className="border-l-2 border-ink/20 pl-4 text-sm text-ink/60"
                  >
                    “{quote}”
                  </blockquote>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">
            Action →{" "}
          </span>
          {theme.action}
        </p>
      </div>
    </article>
  );
}

export default function ReportView({ report }) {
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs text-ink/60">
          {report.items_analysed} items analysed
        </p>
        <p className="font-mono text-xs text-ink/60">
          Overall: <SentimentTag sentiment={report.overall_sentiment} />
        </p>
      </div>

      <p className="mt-6 text-xl leading-relaxed">{report.summary}</p>

      <div className="mt-10">
        {report.themes.map((theme) => (
          <ThemeCard key={theme.rank} theme={theme} />
        ))}
      </div>
    </div>
  );
}

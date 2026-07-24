import { useState } from "react";

const SENTIMENT_COLOURS = {
  positive: "text-emerald-700 dark:text-emerald-400",
  negative: "text-signal",
  mixed: "text-amber-700 dark:text-amber-400",
};

// Chip background/ink per sentiment — used for the theme tags.
const SENTIMENT_CHIP = {
  positive:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  negative:
    "bg-signal/15 text-signal dark:bg-signal/20 dark:text-signal",
  mixed:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

// Big display value for the overall-sentiment stat cell.
const SENTIMENT_STAT = {
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
          className={`h-2.5 w-2.5 ${i <= value ? "bg-signal" : "bg-rule"}`}
        />
      ))}
    </span>
  );
}

function ThemeCard({ theme, isTop }) {
  const [showEvidence, setShowEvidence] = useState(false);
  // Reports saved before the contract grew `quotes` carried one `example`.
  const quotes = theme.quotes ?? (theme.example ? [theme.example] : []);
  const [lead, ...evidence] = quotes;

  return (
    <article className="mb-5 grid grid-cols-[88px_1fr] border-2 border-ink">
      {/* Rank cell — the #1 theme fills with signal red. */}
      <div
        className={`flex flex-col items-start justify-between border-r-2 border-ink p-4 ${
          isTop ? "bg-signal text-white" : "bg-paper text-ink"
        }`}
      >
        <span className="font-bold leading-[0.9] text-[42px] tracking-tight">
          {String(theme.rank).padStart(2, "0")}
        </span>
        <span className="mt-6">
          <FrequencyMeter value={theme.frequency} />
        </span>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="max-w-[34ch] text-2xl font-bold tracking-tight">
            {theme.title}
          </h2>
          <span
            className={`font-mono text-[11px] uppercase tracking-[0.14em] px-2.5 py-1 ${
              SENTIMENT_CHIP[theme.sentiment] ?? "bg-ink/10 text-ink/70"
            }`}
          >
            ● {theme.sentiment}
          </span>
        </div>

        <p className="mt-2.5 font-mono text-xs text-ink/50">{theme.mentions}</p>

        {lead && (
          <blockquote className="mt-4 border-l-2 border-signal pl-4 text-ink/70">
            “{lead}”
          </blockquote>
        )}

        {evidence.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              aria-expanded={showEvidence}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50 underline decoration-rule underline-offset-4 transition-colors hover:text-signal print:hidden"
            >
              {showEvidence
                ? "Hide the evidence"
                : `Show the evidence — ${evidence.length} more ${
                    evidence.length === 1 ? "quote" : "quotes"
                  }`}
            </button>
            {showEvidence && (
              <div className="mt-3 space-y-2.5 border-l border-rule pl-4">
                {evidence.map((quote, i) => (
                  <blockquote key={i} className="text-sm text-ink/60">
                    “{quote}”
                  </blockquote>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid grid-cols-[auto_1fr] items-baseline gap-x-3.5 border-t border-rule pt-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-signal">
            Action →
          </span>
          <p className="text-sm leading-relaxed">{theme.action}</p>
        </div>
      </div>
    </article>
  );
}

export default function ReportView({ report }) {
  return (
    <div className="mt-8">
      {/* At-a-glance strip — the whole report in three cells. */}
      <div className="grid grid-cols-3 border-2 border-ink">
        <div className="border-r-2 border-ink p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
            Items analysed
          </p>
          <p className="mt-2.5 text-4xl font-bold leading-none">
            {report.items_analysed}
          </p>
        </div>
        <div className="border-r-2 border-ink p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
            Overall sentiment
          </p>
          <p
            className={`mt-2.5 text-4xl font-bold capitalize leading-none ${
              SENTIMENT_STAT[report.overall_sentiment] ?? "text-ink"
            }`}
          >
            {report.overall_sentiment}
          </p>
        </div>
        <div className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
            Themes found
          </p>
          <p className="mt-2.5 text-4xl font-bold leading-none">
            {report.themes.length}
          </p>
        </div>
      </div>

      <p className="mt-7 max-w-[60ch] text-2xl leading-snug tracking-tight text-pretty">
        {report.summary}
      </p>

      <div className="mt-10">
        {report.themes.map((theme) => (
          <ThemeCard key={theme.rank} theme={theme} isTop={theme.rank === 1} />
        ))}
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import ReportView from "./ReportView.jsx";
import { SAMPLE_FEEDBACK } from "./sampleData.js";
import { reportToMarkdown } from "./markdown.js";
import { parseCsv, hasHeaderRow, pickTextColumn } from "./csv.js";
import { loadHistory, addToHistory, removeFromHistory } from "./history.js";
import CompareView, { formatWhen } from "./CompareView.jsx";
import { MAX_FEEDBACK_CHARS } from "../limits.js";

export default function App() {
  const [feedback, setFeedback] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [importInfo, setImportInfo] = useState(null);
  const fileInputRef = useRef(null);
  const [history, setHistory] = useState(loadHistory);
  const [compareBase, setCompareBase] = useState(null);
  const [comparePair, setComparePair] = useState(null);
  // index.html sets the class before first paint; this just mirrors it.
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // Private browsing — the choice just won't persist.
    }
  }

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
      setHistory(addToHistory(data.report));
    } catch (err) {
      setError(err.message || "Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSample() {
    setFeedback(SAMPLE_FEEDBACK);
    setImportInfo(null);
    setError(null);
  }

  // A CSV import keeps its parsed rows around so the column can be switched.
  function applyImport(info) {
    setImportInfo(info);
    setFeedback(
      info.rows
        .map((r) => r[info.column] ?? "")
        .filter((cell) => cell.trim())
        .join("\n\n")
    );
    setError(null);
  }

  async function handleFile(file) {
    if (!file) return;
    const text = await file.text();
    if (/\.csv$/i.test(file.name)) {
      const parsed = parseCsv(text);
      if (!parsed.length) {
        setError("That file looks empty.");
        return;
      }
      const header = hasHeaderRow(parsed);
      const headers = header
        ? parsed[0]
        : parsed[0].map((_, i) => `Column ${i + 1}`);
      const rows = header ? parsed.slice(1) : parsed;
      applyImport({
        filename: file.name,
        headers,
        rows,
        column: pickTextColumn(rows),
      });
    } else {
      setImportInfo(null);
      setFeedback(text);
      setError(null);
    }
  }

  function handleCompareClick(entry) {
    if (!compareBase) {
      setCompareBase(entry);
    } else if (compareBase.id === entry.id) {
      setCompareBase(null);
    } else {
      setComparePair([compareBase, entry]);
      setCompareBase(null);
    }
  }

  function handleDeleteEntry(id) {
    setHistory(removeFromHistory(id));
    if (compareBase?.id === id) setCompareBase(null);
    if (comparePair?.some((entry) => entry.id === id)) setComparePair(null);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reportToMarkdown(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't access the clipboard — use Print / PDF instead.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-14">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60">
            Distil
          </p>
          <button
            onClick={toggleTheme}
            aria-pressed={dark}
            className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60 transition-colors hover:text-signal print:hidden"
          >
            {dark ? "○ Light" : "● Dark"}
          </button>
        </div>
        <h1 className="mt-3 text-5xl font-bold tracking-tight">
          Insight Engine<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-xl text-ink/70 print:hidden">
          Paste a pile of reviews, tickets or survey answers. Get back a
          one-page report: the themes that matter, the sentiment behind each,
          and what to do about them — in order.
        </p>
      </header>

      <section className="print:hidden">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="feedback"
            className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60"
          >
            The more, the better
          </label>
          <div className="flex gap-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={loading}
              className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60 underline decoration-rule underline-offset-4 transition-colors hover:text-signal disabled:opacity-40"
            >
              Upload .csv / .txt
            </button>
            <button
              onClick={handleSample}
              disabled={loading}
              className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60 underline decoration-rule underline-offset-4 transition-colors hover:text-signal disabled:opacity-40"
            >
              Try it with sample data
            </button>
          </div>
        </div>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            // A manual edit means the CSV column mapping no longer applies.
            setImportInfo(null);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files[0]);
          }}
          placeholder="Paste customer feedback here — reviews, tickets, survey responses, any mix… or drop a .csv / .txt file"
          rows={10}
          className="mt-3 w-full resize-y border border-ink/20 bg-white p-4 text-sm leading-relaxed outline-none placeholder:text-ink/30 focus:border-ink dark:bg-ink/5"
        />
        {importInfo && (
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs text-ink/60">
            <span>
              {importInfo.filename} — {importInfo.rows.length.toLocaleString()}{" "}
              rows, reading column
            </span>
            <select
              value={importInfo.column}
              onChange={(e) =>
                applyImport({ ...importInfo, column: Number(e.target.value) })
              }
              className="border border-ink/20 bg-transparent px-1 py-0.5 outline-none focus:border-ink"
            >
              {importInfo.headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `Column ${i + 1}`}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setImportInfo(null);
                setFeedback("");
              }}
              className="underline decoration-rule underline-offset-4 transition-colors hover:text-signal"
            >
              Clear
            </button>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span
            className={`font-mono text-xs ${
              feedback.length > MAX_FEEDBACK_CHARS
                ? "text-signal"
                : feedback.length > MAX_FEEDBACK_CHARS * 0.9
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-ink/40"
            }`}
          >
            {feedback.length.toLocaleString()}
            {feedback.length > MAX_FEEDBACK_CHARS * 0.9 &&
              ` / ${MAX_FEEDBACK_CHARS.toLocaleString()}`}{" "}
            characters
            {feedback.length > MAX_FEEDBACK_CHARS && " — too much to analyse"}
          </span>
          <button
            onClick={() => analyse(feedback)}
            disabled={loading || feedback.length > MAX_FEEDBACK_CHARS}
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

      {(loading || report) && (
        <section className="mt-16 print:mt-8" aria-live="polite">
          <div className="flex items-baseline justify-between border-t border-ink pt-3">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60">
              02 — Report
            </p>
            {report && !loading && (
              <div className="flex gap-6 print:hidden">
                <button
                  onClick={handleCopy}
                  className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60 underline decoration-rule underline-offset-4 transition-colors hover:text-signal"
                >
                  {copied ? "Copied ✓" : "Copy markdown"}
                </button>
                <button
                  onClick={() => window.print()}
                  className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60 underline decoration-rule underline-offset-4 transition-colors hover:text-signal"
                >
                  Print / PDF
                </button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="mt-8 space-y-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">
                <span className="inline-block h-3 w-3 animate-pulse bg-signal align-baseline" />{" "}
                Reading every piece of feedback…
              </p>
              <div className="h-4 w-3/4 animate-pulse bg-rule" />
              <div className="h-4 w-2/3 animate-pulse bg-rule" />
              <div className="h-4 w-1/2 animate-pulse bg-rule" />
            </div>
          ) : (
            <ReportView report={report} />
          )}
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-16 print:hidden">
          <div className="flex items-baseline justify-between border-t border-ink pt-3">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/60">
              03 — Past reports
            </p>
            {comparePair && (
              <button
                onClick={() => setComparePair(null)}
                className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60 underline decoration-rule underline-offset-4 transition-colors hover:text-signal"
              >
                Close comparison
              </button>
            )}
          </div>

          {comparePair ? (
            <CompareView a={comparePair[0]} b={comparePair[1]} />
          ) : (
            <>
              {compareBase && (
                <p className="mt-4 border-l-2 border-signal pl-3 font-mono text-xs text-ink/60">
                  Comparing with {formatWhen(compareBase.at)} — pick a second
                  report.
                </p>
              )}
              <ul className="mt-4">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-3"
                  >
                    <button
                      onClick={() => {
                        setReport(entry.report);
                        setComparePair(null);
                        setError(null);
                      }}
                      className="min-w-0 flex-1 text-left transition-colors hover:text-signal"
                      title="Reopen this report"
                    >
                      <span className="font-mono text-xs text-ink/50">
                        {formatWhen(entry.at)}
                      </span>
                      <span className="ml-4 text-sm">
                        {entry.report.items_analysed} items —{" "}
                        {entry.report.summary.length > 90
                          ? `${entry.report.summary.slice(0, 90)}…`
                          : entry.report.summary}
                      </span>
                    </button>
                    <span className="flex gap-4">
                      <button
                        onClick={() => handleCompareClick(entry)}
                        className={`font-mono text-xs uppercase tracking-[0.2em] underline decoration-rule underline-offset-4 transition-colors hover:text-signal ${
                          compareBase?.id === entry.id
                            ? "text-signal"
                            : "text-ink/50"
                        }`}
                      >
                        {compareBase?.id === entry.id ? "Picked" : "Compare"}
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        aria-label="Delete this report from history"
                        className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50 transition-colors hover:text-signal"
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
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

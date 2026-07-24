// Turns a report object (the CONTRACT.md shape) into clean Markdown that
// pastes well into Slack, Notion, email or a ticket.
export function reportToMarkdown(report) {
  const lines = [
    "# Voice of Customer — Insights Report",
    "",
    `${report.items_analysed} items analysed · Overall sentiment: ${report.overall_sentiment}`,
    "",
    report.summary,
    "",
  ];

  for (const theme of report.themes) {
    const quotes = theme.quotes ?? (theme.example ? [theme.example] : []);
    lines.push(
      `## ${String(theme.rank).padStart(2, "0")} — ${theme.title}`,
      "",
      `**Sentiment:** ${theme.sentiment} · **Frequency:** ${theme.frequency}/5 (${theme.mentions})`,
      "",
      ...quotes.map((quote) => `> “${quote}”`),
      "",
      `**Action →** ${theme.action}`,
      ""
    );
  }

  return lines.join("\n").trim() + "\n";
}

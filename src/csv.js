// A small, honest CSV parser — handles quoted fields, embedded commas,
// escaped quotes and newlines inside cells. Real feedback exports (Zendesk,
// Intercom, app-store reviews) are full of all four.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// A header row is short labels, not prose: no cell reads like a sentence.
export function hasHeaderRow(rows) {
  if (rows.length < 2) return false;
  return rows[0].every((cell) => cell.length < 40 && !/[.!?]\s/.test(cell));
}

// The feedback column is almost always the one with the longest cells.
export function pickTextColumn(rows) {
  const width = Math.max(...rows.map((r) => r.length));
  let best = 0;
  let bestAvg = -1;
  for (let col = 0; col < width; col++) {
    const avg =
      rows.reduce((sum, r) => sum + (r[col] ?? "").length, 0) / rows.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = col;
    }
  }
  return best;
}

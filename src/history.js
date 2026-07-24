// Past reports live in localStorage — no backend, no accounts, still £0.
const KEY = "distil.history";
const MAX_ENTRIES = 12;

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked — history just won't survive a refresh.
  }
  return list;
}

export function addToHistory(report) {
  const entry = { id: Date.now(), at: new Date().toISOString(), report };
  return persist([entry, ...loadHistory()].slice(0, MAX_ENTRIES));
}

export function removeFromHistory(id) {
  return persist(loadHistory().filter((entry) => entry.id !== id));
}

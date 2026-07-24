// Shared between the browser (character counter) and the server (hard cap)
// so the two can never disagree about how much feedback is too much.
export const MAX_FEEDBACK_CHARS = 300_000;

// A shareable report is the report itself, compressed into the URL fragment
// — deflated JSON, base64url. No backend storage, and the fragment never
// leaves the browser (servers don't even see it). Still £0.

const PREFIX = "#r=";

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Chunked: spreading a large array into fromCharCode blows the arg limit.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str) {
  const binary = atob(str.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function reportToHash(report) {
  const bytes = new TextEncoder().encode(JSON.stringify(report));
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return PREFIX + toBase64Url(await new Response(stream).arrayBuffer());
}

// Returns the report, or null if the hash isn't ours or doesn't decode.
export async function reportFromHash(hash) {
  if (!hash?.startsWith(PREFIX)) return null;
  try {
    const bytes = fromBase64Url(hash.slice(PREFIX.length));
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    return JSON.parse(await new Response(stream).text());
  } catch {
    return null;
  }
}

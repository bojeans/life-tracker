// Resolves a stored media key to a URL the browser can load.
//
// For the demo / local slice, keys are paths under /public (e.g.
// "/demo/travel/japan-1.svg") or absolute URLs, returned as-is. When media
// moves to object storage (Cloudflare R2), swap the body for a signed-URL
// resolver — the gallery and shared view only ever call mediaUrl()/thumbUrl(),
// so nothing else has to change.
export function mediaUrl(key: string | null | undefined): string {
  if (!key) return "";
  if (/^https?:\/\//.test(key) || key.startsWith("/")) return key;
  return `/${key}`;
}

// Prefer the small thumbnail for grids; fall back to the original if absent.
export function thumbUrl(item: {
  thumbKey: string | null;
  storageKey: string;
}): string {
  return mediaUrl(item.thumbKey ?? item.storageKey);
}

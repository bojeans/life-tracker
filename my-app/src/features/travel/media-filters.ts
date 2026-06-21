// Gallery filter criteria. Kept as a plain, serializable object so it can be
// passed to a server action, stored in a query key, and (later) emitted by an
// LLM "find my photos of …" feature. Client-safe: no Node-only APIs here.
export type MediaFilter = {
  album?: string; // exact album/folder match
  tag?: string; // item must carry this tag
  from?: string; // YYYY-MM-DD, inclusive lower bound on takenAt
  to?: string; // YYYY-MM-DD, inclusive upper bound on takenAt
};

export const EMPTY_MEDIA_FILTER: MediaFilter = {};

export function isEmptyMediaFilter(f: MediaFilter): boolean {
  return !f.album && !f.tag && !f.from && !f.to;
}

// Builds the Prisma `where` fragment for a filter (the userId scope is added by
// the action). Pure and serializable, so it's easy to unit-test in isolation.
export function buildMediaWhere(filter: MediaFilter): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filter.album) where.album = filter.album;
  if (filter.tag) where.tags = { has: filter.tag };

  const takenAt: Record<string, Date> = {};
  if (filter.from) takenAt.gte = new Date(`${filter.from}T00:00:00.000Z`);
  if (filter.to) takenAt.lte = new Date(`${filter.to}T23:59:59.999Z`);
  if (Object.keys(takenAt).length > 0) where.takenAt = takenAt;

  return where;
}

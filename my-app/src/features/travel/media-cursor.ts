// Keyset (seek) pagination cursor for the gallery. The list is ordered by
// (takenAt desc, id desc), so a cursor captures the sort key of the last item on
// a page; the next page is everything strictly "after" it. Keyset beats OFFSET
// for a large, rarely-changing archive — no rows are skipped or repeated when
// the dataset shifts, and the index does the work.
//
// Server-only (uses Buffer). The client treats the encoded value as opaque.
export type MediaCursor = { takenAt: string | null; id: string };

// "<takenAtISO|>|<id>" base64url-encoded — compact and URL-safe.
export function encodeCursor(cursor: MediaCursor): string {
  return Buffer.from(`${cursor.takenAt ?? ""}|${cursor.id}`).toString(
    "base64url",
  );
}

export function decodeCursor(raw: string): MediaCursor | null {
  try {
    const [takenAt, id] = Buffer.from(raw, "base64url").toString().split("|");
    if (!id) return null;
    return { takenAt: takenAt || null, id };
  } catch {
    return null;
  }
}

// Prisma `where` fragment selecting rows strictly after the cursor under the
// (takenAt desc, id desc) order: an older takenAt, or the same takenAt with a
// smaller id. Items with no takenAt sort last and page by id alone.
export function cursorWhere(cursor: MediaCursor): Record<string, unknown> {
  if (cursor.takenAt === null) {
    return { takenAt: null, id: { lt: cursor.id } };
  }
  const takenAt = new Date(cursor.takenAt);
  return {
    OR: [{ takenAt: { lt: takenAt } }, { takenAt, id: { lt: cursor.id } }],
  };
}

"use server";

import { resolveActorUserId } from "@/lib/actor";
import { db } from "@/lib/db";
import { toMediaItemDTO } from "./media-serialize";
import { buildMediaWhere, type MediaFilter } from "./media-filters";
import { cursorWhere, decodeCursor, encodeCursor } from "./media-cursor";
import type { MediaPage } from "./media-types";

// How many items per gallery page. The grid loads only thumbnails, so this can
// be generous without much cost.
const PAGE_SIZE = 24;

// Owner (signed-in) or a gated demo visitor — see @/lib/actor.
async function requireUserId(): Promise<string> {
  return resolveActorUserId();
}

// A page of the owner's media, newest first, narrowed by `filter` and seeked
// past `cursor` (keyset pagination). Pass the returned `nextCursor` back in to
// load the following page; null means there are no more.
export async function getMediaPage(
  filter: MediaFilter = {},
  cursor?: string | null,
): Promise<MediaPage> {
  const userId = await requireUserId();
  const decoded = cursor ? decodeCursor(cursor) : null;

  // Fetch one extra row to detect whether another page exists.
  const rows = await db.mediaItem.findMany({
    where: {
      userId,
      ...buildMediaWhere(filter),
      ...(decoded ? cursorWhere(decoded) : {}),
    },
    orderBy: [{ takenAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
  });

  const hasMore = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE).map(toMediaItemDTO);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ takenAt: last.takenAt, id: last.id })
      : null;

  return { items, nextCursor };
}

// Distinct, non-empty album names for the filter dropdown (owner-scoped).
export async function getAlbums(): Promise<string[]> {
  const userId = await requireUserId();
  const rows = await db.mediaItem.findMany({
    where: { userId, album: { not: null } },
    distinct: ["album"],
    select: { album: true },
    orderBy: { album: "asc" },
  });
  return rows.map((r) => r.album).filter((a): a is string => Boolean(a));
}

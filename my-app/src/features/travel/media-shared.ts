import { db } from "@/lib/db";
import { toMediaItemDTO } from "./media-serialize";
import type { MediaItemDTO } from "./media-types";

export type SharedMedia = {
  // Newest-first, capped — the public view shows a highlights grid, not the
  // whole archive.
  items: MediaItemDTO[];
  albums: string[];
} | null;

// Public, read-only lookup by share token. Returns null when the token is
// unknown or the owner has no media (so the page can skip the section).
export async function getSharedMedia(shareToken: string): Promise<SharedMedia> {
  const user = await db.user.findUnique({
    where: { shareToken },
    select: {
      mediaItems: {
        orderBy: [{ takenAt: "desc" }, { id: "desc" }],
        take: 12,
      },
    },
  });

  if (!user) return null;
  const items = (user.mediaItems ?? []).map(toMediaItemDTO);
  if (items.length === 0) return null;

  const albums = [
    ...new Set(
      items.map((i) => i.album).filter((a): a is string => Boolean(a)),
    ),
  ];
  return { items, albums };
}

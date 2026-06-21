import type { MediaItemDTO, MediaType } from "./media-types";

export type MediaItemRow = {
  id: string;
  type: string;
  storageKey: string;
  thumbKey: string | null;
  title: string | null;
  album: string | null;
  takenAt: Date | null;
  lat: number | null;
  lng: number | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  tags: string[];
  source: string;
};

// Maps a Prisma row to a serializable DTO (Date -> ISO string).
export function toMediaItemDTO(row: MediaItemRow): MediaItemDTO {
  return {
    id: row.id,
    type: row.type as MediaType,
    storageKey: row.storageKey,
    thumbKey: row.thumbKey,
    title: row.title,
    album: row.album,
    takenAt: row.takenAt ? row.takenAt.toISOString() : null,
    lat: row.lat,
    lng: row.lng,
    width: row.width,
    height: row.height,
    durationSec: row.durationSec,
    tags: row.tags,
    source: row.source,
  };
}

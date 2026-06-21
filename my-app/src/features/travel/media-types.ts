// Plain, fully-serializable shape sent to client components. Prisma's Date can't
// cross the server→client boundary cleanly, so the server maps rows to this DTO
// (Date → ISO string) first.
export type MediaType = "PHOTO" | "VIDEO";

export type MediaItemDTO = {
  id: string;
  type: MediaType;
  storageKey: string;
  thumbKey: string | null;
  title: string | null;
  album: string | null;
  takenAt: string | null; // ISO 8601
  lat: number | null;
  lng: number | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  tags: string[];
  source: string;
};

// One page of gallery results. `nextCursor` is an opaque token to pass back to
// fetch the following page (keyset pagination); null when there are no more.
export type MediaPage = {
  items: MediaItemDTO[];
  nextCursor: string | null;
};

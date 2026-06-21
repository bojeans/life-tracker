"use client";

/* eslint-disable @next/next/no-img-element -- media are user-supplied files of
   arbitrary origin (and will move to signed object-storage URLs); next/image
   would need per-host config and doesn't fit the key→URL resolver seam. */

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getMediaPage } from "./media-actions";
import {
  EMPTY_MEDIA_FILTER,
  isEmptyMediaFilter,
  type MediaFilter,
} from "./media-filters";
import { mediaUrl, thumbUrl } from "./media-url";
import type { MediaItemDTO, MediaPage } from "./media-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-NZ", {
        timeZone: "UTC",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

const fmtDuration = (s: number | null) => {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
};

export function TravelGallery({
  initialPage,
  albums,
}: {
  initialPage: MediaPage;
  albums: string[];
}) {
  const [filter, setFilter] = useState<MediaFilter>(EMPTY_MEDIA_FILTER);
  const [active, setActive] = useState<MediaItemDTO | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["media", filter],
      queryFn: ({ pageParam }) => getMediaPage(filter, pageParam),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // The server already rendered the first unfiltered page; reuse it so the
      // grid paints immediately and only refetches once a filter is applied.
      initialData: isEmptyMediaFilter(filter)
        ? { pages: [initialPage], pageParams: [null] }
        : undefined,
    });

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  return (
    <div className="space-y-4">
      <MediaFilterBar filter={filter} albums={albums} onChange={setFilter} />

      {items.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          {isFetching
            ? "Loading…"
            : isEmptyMediaFilter(filter)
              ? "No photos or videos yet."
              : "Nothing matches these filters."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActive(item)}
                className="group bg-muted relative block aspect-square w-full overflow-hidden rounded-lg"
                aria-label={item.title ?? "Open media"}
              >
                <img
                  src={thumbUrl(item)}
                  alt={item.title ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                {item.type === "VIDEO" && (
                  <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                    ▶ {fmtDuration(item.durationSec) ?? "video"}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <Lightbox item={active} onClose={() => setActive(null)} />
    </div>
  );
}

function MediaFilterBar({
  filter,
  albums,
  onChange,
}: {
  filter: MediaFilter;
  albums: string[];
  onChange: (f: MediaFilter) => void;
}) {
  // Debounce the free-text tag so we don't refetch on every keystroke.
  const [tag, setTag] = useState(filter.tag ?? "");
  useEffect(() => {
    const id = setTimeout(() => {
      onChange({ ...filter, tag: tag.trim() || undefined });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  const set = (patch: Partial<MediaFilter>) =>
    onChange({ ...filter, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="album">Album</Label>
        <select
          id="album"
          value={filter.album ?? ""}
          onChange={(e) => set({ album: e.target.value || undefined })}
          className="border-input h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
        >
          <option value="">All albums</option>
          {albums.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tag">Tag</Label>
        <Input
          id="tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="e.g. beach"
          className="w-36"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="from">From</Label>
        <Input
          id="from"
          type="date"
          value={filter.from ?? ""}
          onChange={(e) => set({ from: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          type="date"
          value={filter.to ?? ""}
          onChange={(e) => set({ to: e.target.value || undefined })}
        />
      </div>

      {!isEmptyMediaFilter(filter) && (
        <Button
          variant="ghost"
          onClick={() => {
            setTag("");
            onChange(EMPTY_MEDIA_FILTER);
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

function Lightbox({
  item,
  onClose,
}: {
  item: MediaItemDTO | null;
  onClose: () => void;
}) {
  const date = item ? fmtDate(item.takenAt) : null;
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle className="sr-only">
          {item?.title ?? "Media"}
        </DialogTitle>
        {item && (
          <div className="space-y-3">
            <div className="bg-muted overflow-hidden rounded-lg">
              {item.type === "VIDEO" ? (
                <video
                  src={mediaUrl(item.storageKey)}
                  poster={item.thumbKey ? mediaUrl(item.thumbKey) : undefined}
                  controls
                  className="max-h-[70vh] w-full"
                />
              ) : (
                <img
                  src={mediaUrl(item.storageKey)}
                  alt={item.title ?? ""}
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                {item.title && <p className="font-medium">{item.title}</p>}
                <p className="text-muted-foreground text-sm">
                  {[item.album, date].filter(Boolean).join(" · ")}
                </p>
              </div>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

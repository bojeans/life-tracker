import { getMediaPage, getAlbums } from "@/features/travel/media-actions";
import { TravelGallery } from "@/features/travel/media-gallery";

export default async function TravelPage() {
  const [page, albums] = await Promise.all([getMediaPage(), getAlbums()]);

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">Travel</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your photos and videos, newest first. Filter by album, tag or date.
        </p>
      </div>
      <TravelGallery initialPage={page} albums={albums} />
    </main>
  );
}

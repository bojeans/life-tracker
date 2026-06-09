import { auth } from "@/lib/auth";
import { getMyShareToken } from "@/features/share/actions";
import { ShareLinkCard } from "@/features/share/share-link-card";

// Owner-only. The (app) layout also lets demo visitors in, but sharing is an
// account action, so a demo actor (no real session) gets a gentle notice.
export default async function SharePage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Share</h1>
        <p className="text-muted-foreground text-sm">
          A public, read-only view of your dashboards.
        </p>
      </div>

      {session?.user?.id ? (
        <ShareLinkCard initialToken={await getMyShareToken()} />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Sign in with your own account to get a shareable link.
        </p>
      )}
    </div>
  );
}

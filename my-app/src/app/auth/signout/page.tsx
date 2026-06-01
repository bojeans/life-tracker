import { signOut } from "@/lib/auth";

export default function SignOutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Sign out</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/auth/signin" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-foreground px-4 py-2 text-background hover:opacity-90"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

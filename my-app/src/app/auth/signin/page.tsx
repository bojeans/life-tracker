import { signIn } from "@/lib/auth";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <h1 className="text-2xl font-bold text-center">Sign in</h1>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/finance" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-foreground px-4 py-2 text-background hover:opacity-90"
          >
            Continue with GitHub
          </button>
        </form>
      </div>
    </main>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { isDemoActor } from "@/lib/actor";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const demo = await isDemoActor();
  if (!session && !demo) redirect("/auth/signin");

  return <AppShell isDemo={demo}>{children}</AppShell>;
}

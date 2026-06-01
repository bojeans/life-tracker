import { db } from "@/lib/db";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ shareToken: string }>;
}

export default async function SharedPage({ params }: Props) {
  const { shareToken } = await params;

  const user = await db.user.findUnique({
    where: { shareToken },
    select: { name: true, email: true },
  });

  if (!user) notFound();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">{user.name ?? "Portfolio"}</h1>
      <p className="text-muted-foreground mt-2">
        Public recruiter view — read only.
      </p>
    </main>
  );
}

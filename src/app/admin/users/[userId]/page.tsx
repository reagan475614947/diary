import { connection } from "next/server";
import { notFound } from "next/navigation";
import { HistoryPage } from "@/components/history/history-page";
import { AppShell } from "@/components/layout/app-shell";
import { requireAdminSession } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import { readEntriesFromDisk } from "@/lib/server-diary-store";

type AdminUserPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminUserPage({ params }: AdminUserPageProps) {
  await connection();
  const session = await requireAdminSession();
  const { userId } = await params;
  const user = await findUserById(userId);
  if (!user) notFound();

  const entries = await readEntriesFromDisk(userId);

  return (
    <AppShell
      title={`${user.name} 的日记`}
      description={`${user.email} · 共 ${entries.length} 条记录`}
      userName={session.name}
      isAdmin={session.isAdmin}
    >
      <HistoryPage initialEntries={entries} deleted={false} />
    </AppShell>
  );
}

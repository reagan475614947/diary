import { connection } from "next/server";
import { HistoryPage } from "@/components/history/history-page";
import { requireSession } from "@/lib/auth";
import { readEntriesFromDisk } from "@/lib/server-diary-store";

type DiaryHistoryPageProps = {
  searchParams: Promise<{
    deleted?: string;
  }>;
};

export default async function DiaryHistoryPage({ searchParams }: DiaryHistoryPageProps) {
  await connection();
  const session = await requireSession();
  const initialEntries = await readEntriesFromDisk(session.userId);
  const resolvedSearchParams = await searchParams;

  return (
    <HistoryPage
      initialEntries={initialEntries}
      deleted={resolvedSearchParams.deleted === "1"}
      userName={session.name}
      isAdmin={session.isAdmin}
    />
  );
}

import { connection } from "next/server";
import { SummaryPage } from "@/components/summary/summary-page";
import { requireSession } from "@/lib/auth";
import { getAiSummarySnapshot } from "@/lib/server-ai-summary-store";
import { readEntriesFromDisk } from "@/lib/server-diary-store";

export default async function DiarySummaryPage() {
  await connection();
  const session = await requireSession();
  const { userId } = session;
  const initialEntries = await readEntriesFromDisk(userId);
  const [monthSnapshot, allSnapshot] = await Promise.all([
    getAiSummarySnapshot(userId, "month", initialEntries),
    getAiSummarySnapshot(userId, "all", initialEntries),
  ]);
  const aiAvailable = Boolean(
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_openai_api_key",
  );

  return (
    <SummaryPage
      initialEntries={initialEntries}
      initialAiSnapshots={{
        month: monthSnapshot,
        all: allSnapshot,
      }}
      aiAvailable={aiAvailable}
      userName={session.name}
      isAdmin={session.isAdmin}
    />
  );
}

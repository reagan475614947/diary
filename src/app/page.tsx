import { connection } from "next/server";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { getTodayDateValue } from "@/lib/date";
import { requireSession } from "@/lib/auth";
import { readEntriesFromDisk } from "@/lib/server-diary-store";
import { fetchDailyPoem } from "@/lib/server-poem";
import type { DailyPoem } from "@/lib/server-poem";

export default async function Home() {
  await connection();
  const session = await requireSession();
  const initialEntries = await readEntriesFromDisk(session.userId);
  const todayEntry = initialEntries.find((entry) => entry.date === getTodayDateValue()) ?? null;
  const initialWeatherSummary = todayEntry?.weather_manual || todayEntry?.weather_auto || "";
  const initialTime = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const initialPoem = await Promise.race<DailyPoem | null>([
    fetchDailyPoem(initialWeatherSummary),
    new Promise<DailyPoem | null>((resolve) => {
      setTimeout(() => resolve(null), 1200);
    }),
  ]);

  return (
    <HomeDashboard
      initialEntries={initialEntries}
      initialTime={initialTime}
      initialWeatherSummary={initialWeatherSummary}
      initialPoem={initialPoem}
      userName={session.name}
      isAdmin={session.isAdmin}
    />
  );

}

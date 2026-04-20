import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SettingsPage } from "@/components/settings/settings-page";
import { DEFAULT_SETTINGS_ID, mergeSettings } from "@/lib/settings";
import { requireSession } from "@/lib/auth";
import {
  readSettingsFromDisk,
  saveSettingsToDisk,
} from "@/lib/server-diary-store";

type DiarySettingsPageProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

export default async function DiarySettingsPage({ searchParams }: DiarySettingsPageProps) {
  await connection();
  const session = await requireSession();
  const userId = session.userId;
  const initialSettings = await readSettingsFromDisk(userId);
  const resolvedSearchParams = await searchParams;

  async function saveSettings(formData: FormData) {
    "use server";

    const mergedSettings = mergeSettings(initialSettings);

    await saveSettingsToDisk(userId, {
      ...mergedSettings,
      id: DEFAULT_SETTINGS_ID,
      preferred_language: String(formData.get("preferred_language") ?? "zh-CN"),
      ai_style: String(formData.get("ai_style") ?? "objective"),
      reminder_enabled: formData.get("reminder_enabled") === "1",
      reminder_time: String(formData.get("reminder_time") ?? "21:30"),
      weather_auto_enabled: formData.get("weather_auto_enabled") === "1",
      ai_enabled: formData.get("ai_enabled") === "1",
    });

    redirect("/settings?saved=1");
  }

  return (
    <SettingsPage
      initialSettings={initialSettings}
      saveAction={saveSettings}
      saved={resolvedSearchParams.saved === "1"}
      userName={session.name}
      isAdmin={session.isAdmin}
    />
  );
}

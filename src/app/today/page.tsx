import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { TodayEntryPage } from "@/components/today/today-entry-page";
import { getTodayDateValue, getWeekdayLabel } from "@/lib/date";
import { deriveEmotionLabel } from "@/lib/entry-utils";
import { requireSession } from "@/lib/auth";
import {
  readEntryByDateFromDisk,
  readEntriesFromDisk,
  readSettingsFromDisk,
  saveEntryToDisk,
  saveUploadedPhotoToDisk,
} from "@/lib/server-diary-store";

type TodayPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function TodayPage({ searchParams }: TodayPageProps) {
  await connection();
  const session = await requireSession();
  const userId = session.userId;

  const [entries, initialSettings] = await Promise.all([
    readEntriesFromDisk(userId),
    readSettingsFromDisk(userId),
  ]);
  const todayDate = getTodayDateValue();
  const initialEntry = entries.find((entry) => entry.date === todayDate) ?? null;
  const resolvedSearchParams = await searchParams;

  async function saveTodayEntry(formData: FormData) {
    "use server";

    const existingEntry = await readEntryByDateFromDisk(userId, todayDate);
    const weather = String(formData.get("weather_manual") ?? "").trim();
    const happyText = String(formData.get("happy_text") ?? "").trim();
    const sadText = String(formData.get("sad_text") ?? "").trim();
    const confusedText = String(formData.get("confused_text") ?? "").trim();
    const voiceTranscriptHappy = String(formData.get("voice_transcript_happy") ?? "").trim();
    const voiceTranscriptSad = String(formData.get("voice_transcript_sad") ?? "").trim();
    const voiceTranscriptConfused = String(formData.get("voice_transcript_confused") ?? "").trim();
    const autoWeather = String(formData.get("weather_auto") ?? "").trim();
    const photoLocalPathField = String(formData.get("photo_local_path") ?? "").trim();
    const removePhoto = formData.get("remove_photo") === "1";
    const uploadedPhoto = formData.get("photo");

    let photoLocalPath = removePhoto ? "" : photoLocalPathField;
    if (uploadedPhoto instanceof File && uploadedPhoto.size > 0) {
      photoLocalPath = await saveUploadedPhotoToDisk(userId, uploadedPhoto);
    }

    if (!happyText && !sadText && !confusedText && !photoLocalPath) {
      redirect("/today?error=empty");
    }

    const now = new Date().toISOString();
    const nextEntry = {
      id: existingEntry?.id ?? crypto.randomUUID(),
      date: todayDate,
      weekday: getWeekdayLabel(todayDate),
      weather_auto: autoWeather,
      weather_manual: weather,
      happy_text: happyText,
      sad_text: sadText,
      confused_text: confusedText,
      photo_local_path: photoLocalPath,
      voice_transcript_happy: voiceTranscriptHappy,
      voice_transcript_sad: voiceTranscriptSad,
      voice_transcript_confused: voiceTranscriptConfused,
      ai_diary: existingEntry?.ai_diary ?? "",
      emotion_label: deriveEmotionLabel(happyText, sadText),
      tags: existingEntry?.tags ?? [],
      created_at: existingEntry?.created_at ?? now,
      updated_at: now,
    };

    await saveEntryToDisk(userId, nextEntry);
    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath(`/history/${nextEntry.id}`);
    revalidatePath("/summary");
    revalidatePath("/today");
    redirect(`/history/${nextEntry.id}?saved=1`);
  }

  return (
    <TodayEntryPage
      initialEntry={initialEntry}
      initialSettings={initialSettings}
      saveAction={saveTodayEntry}
      errorCode={resolvedSearchParams.error ?? ""}
      userName={session.name}
      isAdmin={session.isAdmin}
    />
  );
}

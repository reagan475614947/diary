import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { HistoryDetailPage } from "@/components/history/history-detail-page";
import { deriveEmotionLabel } from "@/lib/entry-utils";
import { requireSession } from "@/lib/auth";
import {
  deleteEntryFromDisk,
  readEntryByIdFromDisk,
  saveEntryToDisk,
  saveUploadedPhotoToDisk,
} from "@/lib/server-diary-store";

type EntryDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export default async function EntryDetailRoute({
  params,
  searchParams,
}: EntryDetailRouteProps) {
  await connection();
  const session = await requireSession();
  const userId = session.userId;
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const initialEntry = await readEntryByIdFromDisk(userId, id);

  async function updateEntry(formData: FormData) {
    "use server";

    const existingEntry = await readEntryByIdFromDisk(userId, id);
    if (!existingEntry) {
      redirect(`/history/${id}?error=not_found`);
    }

    const weather = String(formData.get("weather") ?? "").trim();
    const happyText = String(formData.get("happy_text") ?? "").trim();
    const sadText = String(formData.get("sad_text") ?? "").trim();
    const confusedText = String(formData.get("confused_text") ?? "").trim();
    const shouldRemovePhoto = formData.get("remove_photo") === "1";
    const uploadedPhoto = formData.get("photo");

    let photoLocalPath = shouldRemovePhoto ? "" : existingEntry.photo_local_path ?? "";

    if (uploadedPhoto instanceof File && uploadedPhoto.size > 0) {
      photoLocalPath = await saveUploadedPhotoToDisk(userId, uploadedPhoto);
    }

    if (!happyText && !sadText && !confusedText && !photoLocalPath) {
      redirect(`/history/${id}?error=empty`);
    }

    await saveEntryToDisk(userId, {
      ...existingEntry,
      weather_manual: weather,
      happy_text: happyText,
      sad_text: sadText,
      confused_text: confusedText,
      photo_local_path: photoLocalPath,
      emotion_label: deriveEmotionLabel(happyText, sadText),
      updated_at: new Date().toISOString(),
    });

    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath(`/history/${id}`);
    revalidatePath("/summary");
    revalidatePath("/today");
    redirect(`/history/${id}?saved=1`);
  }

  async function deleteEntry() {
    "use server";

    await deleteEntryFromDisk(userId, id);
    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath(`/history/${id}`);
    revalidatePath("/summary");
    revalidatePath("/today");
    redirect("/history?deleted=1");
  }

  return (
    <HistoryDetailPage
      entry={initialEntry}
      saveAction={updateEntry}
      deleteAction={deleteEntry}
      saved={resolvedSearchParams.saved === "1"}
      errorCode={resolvedSearchParams.error ?? ""}
      userName={session.name}
      isAdmin={session.isAdmin}
    />
  );
}

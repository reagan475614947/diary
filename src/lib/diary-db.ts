import type { DiaryEntry, DiarySettings } from "@/types/diary";
import { MAX_PHOTO_UPLOAD_BYTES, MAX_PHOTO_UPLOAD_MB } from "@/lib/upload";

// --- Entries ---

export async function listEntries(): Promise<DiaryEntry[]> {
  const response = await fetch("/api/db/entries");
  if (!response.ok) throw new Error("读取记录列表失败");
  return response.json() as Promise<DiaryEntry[]>;
}

export async function getEntryByDate(date: string): Promise<DiaryEntry | null> {
  const response = await fetch(`/api/db/entries?date=${encodeURIComponent(date)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("读取记录失败");
  return response.json() as Promise<DiaryEntry | null>;
}

export async function getEntryById(id: string): Promise<DiaryEntry | null> {
  const response = await fetch(`/api/db/entries/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("读取记录失败");
  return response.json() as Promise<DiaryEntry | null>;
}

export async function saveEntry(entry: DiaryEntry): Promise<void> {
  const response = await fetch("/api/db/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) throw new Error("保存记录失败");
}

// --- Settings ---

export async function getSettings(id: string): Promise<DiarySettings | null> {
  void id;
  const response = await fetch("/api/db/settings");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("读取设置失败");
  return response.json() as Promise<DiarySettings | null>;
}

export async function saveSettings(settings: DiarySettings): Promise<void> {
  const response = await fetch("/api/db/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error("保存设置失败");
}

// --- Photos ---

// Uploads a photo file to the server and returns the serving URL.
// The returned URL can be stored in DiaryEntry.photo_local_path
// and used directly as an <img src>.
export async function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_PHOTO_UPLOAD_BYTES) {
    throw new Error(`照片不能超过 ${MAX_PHOTO_UPLOAD_MB}MB。`);
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/db/photos", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "照片上传失败");
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

// One-time migration: IndexedDB → file system (via API routes).
// Runs on the client side, triggered on first app load after the upgrade.
// Sets localStorage key "diary_migrated_v1" when complete.

import type { DiaryEntry, DiarySettings } from "@/types/diary";

const DB_NAME = "ai-diary-mvp";
const DB_VERSION = 1;
const MIGRATION_KEY = "diary_migrated_v1";

export function isMigrationNeeded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MIGRATION_KEY) !== "1";
  } catch {
    return false;
  }
}

function openLegacyDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      resolve(null);
      return;
    }

    // 3-second timeout to prevent hanging on mobile browsers
    const timer = setTimeout(() => resolve(null), 3000);

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      // New database — let the upgrade complete with no stores created.
      // getAllFromStore will handle missing stores gracefully.
    };

    request.onsuccess = () => {
      clearTimeout(timer);
      resolve(request.result);
    };

    request.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    request.onblocked = () => {
      clearTimeout(timer);
      resolve(null);
    };
  });
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([]);
      return;
    }

    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll() as IDBRequest<T[]>;

    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binaryStr = atob(data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mimeType });
}

async function uploadPhoto(dataUrl: string, entryId: string): Promise<string> {
  const ext = dataUrl.startsWith("data:image/png") ? "png" : "jpg";
  const file = dataUrlToFile(dataUrl, `${entryId}.${ext}`);

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/db/photos", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) return dataUrl; // keep original on failure
  const result = (await response.json()) as { url: string };
  return result.url;
}

export async function runMigration(
  onProgress?: (message: string) => void,
): Promise<void> {
  // Overall timeout: give up after 15 seconds to never block indefinitely
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Migration timeout")), 15000),
  );

  return Promise.race([doMigration(onProgress), timeoutPromise]);
}

async function doMigration(onProgress?: (message: string) => void): Promise<void> {
  onProgress?.("正在打开旧数据库...");

  const db = await openLegacyDb();

  if (!db) {
    // No legacy DB — mark done and exit
    localStorage.setItem(MIGRATION_KEY, "1");
    console.log("[Migration] No legacy IndexedDB found. Nothing to migrate.");
    return;
  }

  onProgress?.("正在读取历史记录...");

  const [entries, settings] = await Promise.all([
    getAllFromStore<DiaryEntry>(db, "entries"),
    getAllFromStore<DiarySettings>(db, "settings"),
  ]);

  db.close();

  if (entries.length === 0 && settings.length === 0) {
    // Nothing to migrate
    localStorage.setItem(MIGRATION_KEY, "1");
    return;
  }

  onProgress?.(`发现 ${entries.length} 条记录，正在迁移...`);

  for (let i = 0; i < entries.length; i++) {
    const entry = { ...entries[i] };

    // Migrate embedded base64 photo to a real file
    if (entry.photo_local_path?.startsWith("data:")) {
      onProgress?.(`迁移照片 (${i + 1}/${entries.length})...`);
      entry.photo_local_path = await uploadPhoto(entry.photo_local_path, entry.id);
    }

    await fetch("/api/db/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  }

  if (settings.length > 0) {
    onProgress?.("迁移设置...");
    await fetch("/api/db/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings[0]),
    });
  }

  localStorage.setItem(MIGRATION_KEY, "1");
  onProgress?.("迁移完成。");
  console.log(`[Migration] Done. Migrated ${entries.length} entries.`);
}

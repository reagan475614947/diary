import fs from "fs/promises";
import path from "path";
import type { DiaryEntry, DiarySettings } from "@/types/diary";

const DATA_ROOT = path.join(process.cwd(), "diary-data", "users");

function getUserDir(userId: string) {
  return path.join(DATA_ROOT, userId);
}

function getEntriesDir(userId: string) {
  return path.join(getUserDir(userId), "entries");
}

function getPhotosDir(userId: string) {
  return path.join(getUserDir(userId), "photos");
}

function getSettingsPath(userId: string) {
  return path.join(getUserDir(userId), "settings.json");
}

function getPhotoRoutePrefix(userId: string) {
  return `/api/db/photos/${userId}/`;
}

type StoredEntryRecord = {
  entry: DiaryEntry;
  fileName: string;
  filePath: string;
};

function buildVersionStem(date: string, revision: number) {
  return `${date}-v${revision}`;
}

function inferRevision(fileName: string, entry: DiaryEntry) {
  if (typeof entry.revision === "number" && entry.revision > 0) {
    return entry.revision;
  }
  const match = fileName.match(/-v(\d+)\.json$/);
  if (match) return Number(match[1]);
  return 1;
}

function normalizeEntry(entry: DiaryEntry, fileName: string): DiaryEntry {
  return { ...entry, revision: inferRevision(fileName, entry) };
}

function resolvePhotoUrlToPath(userId: string, photoUrl: string) {
  const prefix = getPhotoRoutePrefix(userId);
  if (!photoUrl.startsWith(prefix)) return null;
  return path.join(getPhotosDir(userId), path.basename(photoUrl.slice(prefix.length)));
}

async function safeUnlink(filePath: string | null | undefined) {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => undefined);
}

async function safeRename(sourcePath: string, targetPath: string) {
  if (sourcePath === targetPath) return;
  try {
    await fs.rename(sourcePath, targetPath);
  } catch {
    try {
      await fs.copyFile(sourcePath, targetPath);
      await safeUnlink(sourcePath);
    } catch {
      // ignore
    }
  }
}

async function loadStoredEntries(userId: string): Promise<StoredEntryRecord[]> {
  const entriesDir = getEntriesDir(userId);
  const files = await fs.readdir(entriesDir).catch(() => [] as string[]);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const entries = (
    await Promise.all(
      jsonFiles.map(async (fileName) => {
        const filePath = path.join(entriesDir, fileName);
        try {
          const raw = await fs.readFile(filePath, "utf-8");
          const parsed = JSON.parse(raw) as DiaryEntry;
          return { entry: normalizeEntry(parsed, fileName), fileName, filePath } satisfies StoredEntryRecord;
        } catch {
          return null;
        }
      }),
    )
  ).filter((r): r is StoredEntryRecord => r !== null);

  return entries;
}

async function loadStoredEntryById(userId: string, id: string): Promise<StoredEntryRecord | null> {
  const entries = await loadStoredEntries(userId);
  return entries.find((r) => r.entry.id === id) ?? null;
}

async function cleanupOldEntryFiles(userId: string, date: string, keepFilePath: string) {
  const entriesDir = getEntriesDir(userId);
  const files = await fs.readdir(entriesDir).catch(() => [] as string[]);
  const prefix = `${date}-v`;
  await Promise.all(
    files
      .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
      .map(async (f) => {
        const fp = path.join(entriesDir, f);
        if (fp !== keepFilePath) await safeUnlink(fp);
      }),
  );
}

async function cleanupOldPhotoFiles(userId: string, date: string, keepPhotoUrl: string) {
  const photosDir = getPhotosDir(userId);
  const keepFileName = keepPhotoUrl ? path.basename(keepPhotoUrl) : "";
  const files = await fs.readdir(photosDir).catch(() => [] as string[]);
  const prefix = `${date}-v`;
  await Promise.all(
    files
      .filter((f) => f.startsWith(prefix))
      .map(async (f) => {
        if (f !== keepFileName) await safeUnlink(path.join(photosDir, f));
      }),
  );
}

async function cleanupOrphanedPhotos(userId: string) {
  const entries = await readEntriesFromDisk(userId);
  const prefix = getPhotoRoutePrefix(userId);
  const referencedNames = new Set(
    entries
      .map((e) => e.photo_local_path?.trim() ?? "")
      .filter(Boolean)
      .map((url) => path.basename(url.startsWith(prefix) ? url.slice(prefix.length) : url)),
  );
  const photosDir = getPhotosDir(userId);
  const files = await fs.readdir(photosDir).catch(() => [] as string[]);
  await Promise.all(
    files.filter((f) => !referencedNames.has(f)).map((f) => safeUnlink(path.join(photosDir, f))),
  );
}

async function finalizePhotoPath(userId: string, nextEntry: DiaryEntry, previousEntry: DiaryEntry | null): Promise<string> {
  const prefix = getPhotoRoutePrefix(userId);
  const incomingPhotoUrl = nextEntry.photo_local_path?.trim() ?? "";
  const previousPhotoUrl = previousEntry?.photo_local_path?.trim() ?? "";

  if (!incomingPhotoUrl) {
    await safeUnlink(resolvePhotoUrlToPath(userId, previousPhotoUrl));
    return "";
  }

  const sourcePath = resolvePhotoUrlToPath(userId, incomingPhotoUrl);
  if (!sourcePath) {
    if (previousPhotoUrl && previousPhotoUrl !== incomingPhotoUrl) {
      await safeUnlink(resolvePhotoUrlToPath(userId, previousPhotoUrl));
    }
    return incomingPhotoUrl;
  }

  const ext = (path.extname(sourcePath) || ".jpg").toLowerCase();
  const targetFileName = `${buildVersionStem(nextEntry.date, nextEntry.revision ?? 1)}${ext}`;
  const targetPath = path.join(getPhotosDir(userId), targetFileName);
  await safeRename(sourcePath, targetPath);

  const nextPhotoUrl = `${prefix}${targetFileName}`;
  if (previousPhotoUrl && previousPhotoUrl !== incomingPhotoUrl && previousPhotoUrl !== nextPhotoUrl) {
    await safeUnlink(resolvePhotoUrlToPath(userId, previousPhotoUrl));
  }
  return nextPhotoUrl;
}

export async function readEntryByDateFromDisk(userId: string, date: string): Promise<DiaryEntry | null> {
  const entries = await readEntriesFromDisk(userId);
  return entries.find((e) => e.date === date) ?? null;
}

export async function readEntryByIdFromDisk(userId: string, id: string): Promise<DiaryEntry | null> {
  const record = await loadStoredEntryById(userId, id);
  return record?.entry ?? null;
}

export async function readEntriesFromDisk(userId: string): Promise<DiaryEntry[]> {
  const entries = (await loadStoredEntries(userId)).map((r) => r.entry);
  entries.sort((a, b) => {
    if (a.date === b.date) return b.updated_at.localeCompare(a.updated_at);
    return b.date.localeCompare(a.date);
  });
  return entries;
}

export async function saveEntryToDisk(userId: string, entry: DiaryEntry): Promise<void> {
  const entriesDir = getEntriesDir(userId);
  const photosDir = getPhotosDir(userId);
  await fs.mkdir(entriesDir, { recursive: true });
  await fs.mkdir(photosDir, { recursive: true });

  const previousRecord = await loadStoredEntryById(userId, entry.id);
  const previousEntry = previousRecord?.entry ?? null;
  const nextRevision = previousEntry
    ? Math.max(previousEntry.revision ?? 1, entry.revision ?? 0, 1) + 1
    : Math.max(entry.revision ?? 0, 1);
  const nextEntry: DiaryEntry = { ...entry, revision: nextRevision };
  nextEntry.photo_local_path = await finalizePhotoPath(userId, nextEntry, previousEntry);

  const nextFilePath = path.join(entriesDir, `${buildVersionStem(nextEntry.date, nextRevision)}.json`);
  await fs.writeFile(nextFilePath, JSON.stringify(nextEntry, null, 2), "utf-8");

  if (previousRecord && previousRecord.filePath !== nextFilePath) {
    await safeUnlink(previousRecord.filePath);
  }

  await cleanupOldEntryFiles(userId, nextEntry.date, nextFilePath);
  await cleanupOldPhotoFiles(userId, nextEntry.date, nextEntry.photo_local_path ?? "");
  await cleanupOrphanedPhotos(userId);
}

export async function deleteEntryFromDisk(userId: string, id: string): Promise<boolean> {
  const stored = await loadStoredEntryById(userId, id);
  if (!stored) return false;
  await safeUnlink(stored.filePath);
  await safeUnlink(resolvePhotoUrlToPath(userId, stored.entry.photo_local_path?.trim() ?? ""));
  await cleanupOrphanedPhotos(userId);
  return true;
}

export async function saveUploadedPhotoToDisk(userId: string, file: File): Promise<string> {
  const photosDir = getPhotosDir(userId);
  await fs.mkdir(photosDir, { recursive: true });
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(photosDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return `${getPhotoRoutePrefix(userId)}${filename}`;
}

export async function readSettingsFromDisk(userId: string): Promise<DiarySettings | null> {
  try {
    const raw = await fs.readFile(getSettingsPath(userId), "utf-8");
    return JSON.parse(raw) as DiarySettings;
  } catch {
    return null;
  }
}

export async function saveSettingsToDisk(userId: string, settings: DiarySettings): Promise<void> {
  const userDir = getUserDir(userId);
  await fs.mkdir(userDir, { recursive: true });
  await fs.writeFile(getSettingsPath(userId), JSON.stringify(settings, null, 2), "utf-8");
}

export async function getPhotoFilePath(userId: string, filename: string): Promise<string> {
  return path.join(getPhotosDir(userId), filename);
}

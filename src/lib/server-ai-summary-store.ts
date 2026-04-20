import fs from "fs/promises";
import path from "path";
import { createHash } from "node:crypto";
import { getEntriesForSummaryMode, getEntryWeather, getSummaryModeLabel } from "@/lib/entry-utils";
import type {
  AiSummaryMode,
  AiSummaryReview,
  AiSummarySnapshot,
  DiaryEntry,
} from "@/types/diary";

function getAiReviewsDir(userId: string) {
  return path.join(process.cwd(), "diary-data", "users", userId, "ai-reviews");
}

function buildAiSummaryPath(userId: string, mode: AiSummaryMode) {
  return path.join(getAiReviewsDir(userId), `${mode}.json`);
}

export function buildAiSummaryFingerprint(mode: AiSummaryMode, entries: DiaryEntry[]) {
  const payload = entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    weather: getEntryWeather(entry),
    happy_text: entry.happy_text?.trim() ?? "",
    sad_text: entry.sad_text?.trim() ?? "",
    confused_text: entry.confused_text?.trim() ?? "",
    emotion_label: entry.emotion_label ?? "",
    updated_at: entry.updated_at,
  }));

  return createHash("sha1")
    .update(JSON.stringify({ mode, payload }))
    .digest("hex")
    .slice(0, 16);
}

export async function readAiSummaryReviewFromDisk(userId: string, mode: AiSummaryMode): Promise<AiSummaryReview | null> {
  try {
    const raw = await fs.readFile(buildAiSummaryPath(userId, mode), "utf-8");
    return JSON.parse(raw) as AiSummaryReview;
  } catch {
    return null;
  }
}

export async function saveAiSummaryReviewToDisk(userId: string, review: AiSummaryReview): Promise<void> {
  const dir = getAiReviewsDir(userId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(buildAiSummaryPath(userId, review.mode), JSON.stringify(review, null, 2), "utf-8");
}

export async function getAiSummarySnapshot(
  userId: string,
  mode: AiSummaryMode,
  allEntries: DiaryEntry[],
): Promise<AiSummarySnapshot> {
  const scopedEntries = getEntriesForSummaryMode(allEntries, mode);
  const currentFingerprint = buildAiSummaryFingerprint(mode, scopedEntries);
  const review = await readAiSummaryReviewFromDisk(userId, mode);

  return {
    mode,
    period_label: getSummaryModeLabel(mode),
    entry_count: scopedEntries.length,
    current_fingerprint: currentFingerprint,
    review,
    is_stale: Boolean(review && review.fingerprint !== currentFingerprint),
  };
}

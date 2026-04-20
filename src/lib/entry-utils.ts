import { isInCurrentMonth, isWithinLastDays } from "@/lib/date";
import type {
  AiSummaryMode,
  DiaryEntry,
  DiarySummaryStats,
  EmotionLabel,
} from "@/types/diary";

export function deriveEmotionLabel(happyText: string, sadText: string): EmotionLabel {
  const hasHappy = Boolean(happyText.trim());
  const hasSad = Boolean(sadText.trim());

  if (hasHappy && hasSad) {
    return "mixed";
  }

  if (hasHappy) {
    return "happy";
  }

  if (hasSad) {
    return "sad";
  }

  return "neutral";
}

export function getEntryPreview(entry: DiaryEntry) {
  return (
    entry.happy_text ||
    entry.sad_text ||
    entry.confused_text ||
    entry.ai_diary ||
    "这一天只保存了轻量内容。"
  );
}

export function getEntryWeather(entry: DiaryEntry) {
  return entry.weather_manual?.trim() || entry.weather_auto?.trim() || "";
}

export function getSummaryModeLabel(mode: AiSummaryMode) {
  return mode === "month" ? "本月" : "全部";
}

export function getEntriesForSummaryMode(entries: DiaryEntry[], mode: AiSummaryMode) {
  const scopedEntries =
    mode === "month" ? entries.filter((entry) => isInCurrentMonth(entry.date)) : entries;

  return [...scopedEntries].sort((a, b) => {
    if (a.date === b.date) {
      return a.updated_at.localeCompare(b.updated_at);
    }

    return a.date.localeCompare(b.date);
  });
}

export function getCurrentMonthCount(entries: DiaryEntry[]) {
  return entries.filter((entry) => isInCurrentMonth(entry.date)).length;
}

function createSummaryStats(entries: DiaryEntry[], label: string): DiarySummaryStats {
  return entries.reduce<DiarySummaryStats>(
    (stats, entry) => {
      const emotion = entry.emotion_label ?? "neutral";

      stats.entryCount += 1;

      if (emotion === "happy") {
        stats.happyDays += 1;
      }

      if (emotion === "sad") {
        stats.sadDays += 1;
      }

      if (emotion === "mixed") {
        stats.mixedDays += 1;
      }

      if (emotion === "neutral") {
        stats.neutralDays += 1;
      }

      return stats;
    },
    {
      label,
      entryCount: 0,
      happyDays: 0,
      sadDays: 0,
      mixedDays: 0,
      neutralDays: 0,
    },
  );
}

export function buildRecentSummaryStats(entries: DiaryEntry[], days: number) {
  return createSummaryStats(
    entries.filter((entry) => isWithinLastDays(entry.date, days)),
    `最近 ${days} 天`,
  );
}

export function buildCurrentMonthSummaryStats(entries: DiaryEntry[]) {
  return createSummaryStats(
    entries.filter((entry) => isInCurrentMonth(entry.date)),
    "本月",
  );
}

export function buildAllSummaryStats(entries: DiaryEntry[]) {
  return createSummaryStats(entries, "全部");
}

import Image from "next/image";
import Link from "next/link";
import { EmotionBadge } from "@/components/shared/emotion-badge";
import { formatDisplayDate } from "@/lib/date";
import { getEntryPreview, getEntryWeather } from "@/lib/entry-utils";
import type { DiaryEntry } from "@/types/diary";

type EntryCardProps = {
  entry: DiaryEntry;
};

export function EntryCard({ entry }: EntryCardProps) {
  const weather = getEntryWeather(entry);

  return (
    <Link
      href={`/history/${entry.id}`}
      prefetch
      className="rounded-[24px] border border-border bg-card p-4 shadow-[0_14px_34px_rgba(109,85,70,0.08)] backdrop-blur hover:bg-card-strong sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="space-y-2">
            <p className="text-base font-semibold text-foreground">{formatDisplayDate(entry.date)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <EmotionBadge emotion={entry.emotion_label} />
              {weather ? (
                <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-medium text-muted">
                  {weather}
                </span>
              ) : null}
              {entry.ai_diary ? (
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-foreground">
                  AI 文本
                </span>
              ) : null}
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-muted">{getEntryPreview(entry)}</p>
        </div>

        {entry.photo_local_path ? (
          <Image
            src={entry.photo_local_path}
            alt="记录照片缩略图"
            width={112}
            height={112}
            unoptimized
            className="h-24 w-full rounded-[20px] object-cover sm:h-28 sm:w-28"
          />
        ) : null}
      </div>
    </Link>
  );
}

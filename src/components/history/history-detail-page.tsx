/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { formatDisplayDate } from "@/lib/date";
import { getEntryWeather } from "@/lib/entry-utils";
import type { DiaryEntry } from "@/types/diary";

type HistoryDetailPageProps = {
  entry: DiaryEntry | null;
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  saved?: boolean;
  errorCode?: string;
  userName?: string;
  isAdmin?: boolean;
};

export function HistoryDetailPage({
  entry,
  saveAction,
  deleteAction,
  saved = false,
  errorCode = "",
  userName,
  isAdmin,
}: HistoryDetailPageProps) {
  if (!entry) {
    return (
      <AppShell title="记录详情" description="这条记录可能已经被移除。" userName={userName} isAdmin={isAdmin}>
        <EmptyState title="没有找到记录" description="回到历史页重新选一条试试。" />
      </AppShell>
    );
  }

  const errorMessage =
    errorCode === "empty"
      ? "请至少保留一项内容或一张照片。"
      : errorCode === "not_found"
        ? "这条记录不存在。"
        : "";

  return (
    <AppShell
      title="历史记录"
      userName={userName}
      isAdmin={isAdmin}
      action={
        <Link
          href="/history"
          className="inline-flex rounded-full border border-border px-5 py-3 text-sm font-medium text-muted hover:bg-white"
        >
          返回历史
        </Link>
      }
    >
      <form action={saveAction} className="contents">
        <SectionCard title="当天信息">
          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[22px] bg-card-strong p-5">
              <p className="text-sm font-medium text-muted">日期</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {formatDisplayDate(entry.date)}
              </p>
            </div>

            <div className="rounded-[22px] bg-card-strong p-5">
              <label htmlFor="weather" className="block text-sm font-medium text-muted">
                天气
              </label>
              <input
                id="weather"
                name="weather"
                defaultValue={getEntryWeather(entry)}
                placeholder="比如：晴天、阴天、小雨"
                className="mt-3 w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-accent"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="记录内容" description="这里可以直接修改。">
          <div className="grid gap-4">
            <div className="rounded-[22px] bg-card-strong p-5">
              <label htmlFor="happy_text" className="block text-sm font-medium text-muted">
                今天最开心的一件事
              </label>
              <textarea
                id="happy_text"
                name="happy_text"
                defaultValue={entry.happy_text ?? ""}
                placeholder="写下今天最开心的一件事。"
                rows={5}
                className="mt-3 w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm leading-6 text-foreground focus:border-accent"
              />
            </div>

            <div className="rounded-[22px] bg-card-strong p-5">
              <label htmlFor="sad_text" className="block text-sm font-medium text-muted">
                今天最难过的一件事
              </label>
              <textarea
                id="sad_text"
                name="sad_text"
                defaultValue={entry.sad_text ?? ""}
                placeholder="写下今天最难过的一件事。"
                rows={5}
                className="mt-3 w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm leading-6 text-foreground focus:border-accent"
              />
            </div>

            <div className="rounded-[22px] bg-card-strong p-5">
              <label htmlFor="confused_text" className="block text-sm font-medium text-muted">
                今天困惑或想不通的一件事
              </label>
              <textarea
                id="confused_text"
                name="confused_text"
                defaultValue={entry.confused_text ?? ""}
                placeholder="写下今天想不通的一件事。"
                rows={5}
                className="mt-3 w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm leading-6 text-foreground focus:border-accent"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="照片">
          <div className="grid gap-4">
            {entry.photo_local_path ? (
              <div className="overflow-hidden rounded-[22px] bg-card-strong p-4">
                <img
                  src={entry.photo_local_path}
                  alt="当前记录照片"
                  className="w-full rounded-[18px] object-contain"
                />
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-border bg-white/50 px-5 py-8 text-center text-sm text-muted">
                当前还没有照片。
              </div>
            )}

            <div className="rounded-[22px] bg-card-strong p-5">
              <label htmlFor="photo" className="block text-sm font-medium text-muted">
                更换照片
              </label>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                className="mt-3 block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
              />

              {entry.photo_local_path ? (
                <label className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    name="remove_photo"
                    value="1"
                    className="h-4 w-4 rounded border-border"
                  />
                  删除当前照片
                </label>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="保存">
          {saved ? <p className="text-sm font-medium text-[#51674b]">修改已保存。</p> : null}
          {errorMessage ? <p className="text-sm font-medium text-[#9d4a39]">{errorMessage}</p> : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(201,117,80,0.28)] hover:bg-accent-strong"
            >
              保存修改
            </button>
            <Link
              href="/history"
              className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-muted hover:bg-white"
            >
              返回历史
            </Link>
            <button
              type="submit"
              formAction={deleteAction}
              className="inline-flex items-center justify-center rounded-full border border-[#d9a79a] bg-[#fff1ed] px-5 py-3 text-sm font-medium text-[#9d4a39] hover:bg-[#ffe6df]"
            >
              删除这条记录
            </button>
          </div>
        </SectionCard>
      </form>
    </AppShell>
  );
}

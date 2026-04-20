"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EntryCard } from "@/components/history/entry-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { listEntries } from "@/lib/diary-db";
import type { DiaryEntry } from "@/types/diary";

type HistoryPageProps = {
  initialEntries?: DiaryEntry[];
  deleted?: boolean;
  userName?: string;
  isAdmin?: boolean;
};

export function HistoryPage({ initialEntries, deleted = false, userName, isAdmin }: HistoryPageProps) {
  const hasInitialEntries = initialEntries !== undefined;
  const [entries, setEntries] = useState<DiaryEntry[]>(initialEntries ?? []);
  const [isLoading, setIsLoading] = useState(!hasInitialEntries);

  useEffect(() => {
    if (initialEntries === undefined) {
      return;
    }

    setEntries(initialEntries);
    setIsLoading(false);
  }, [initialEntries]);

  useEffect(() => {
    if (hasInitialEntries) {
      return;
    }

    let isMounted = true;

    async function loadEntries() {
      try {
        const storedEntries = await listEntries();

        if (isMounted) {
          setEntries(storedEntries);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadEntries();

    return () => {
      isMounted = false;
    };
  }, [hasInitialEntries]);

  return (
    <AppShell
      title="历史记录"
      userName={userName}
      isAdmin={isAdmin}
      action={
        <Link
          href="/today"
          prefetch
          className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(201,117,80,0.28)] hover:bg-accent-strong"
        >
          写今天
        </Link>
      }
    >
      <SectionCard title="全部记录">
        {deleted ? (
          <p className="mb-4 rounded-[18px] bg-success-soft px-4 py-3 text-sm font-medium text-[#51674b]">
            这条记录已经删除。
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-muted">正在加载记录...</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="还没有记录"
            description="保存第一条之后，这里会按时间倒序展示。"
          />
        ) : (
          <div className="grid gap-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}

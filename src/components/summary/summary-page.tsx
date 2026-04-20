"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { AI_SUMMARY_MODEL_OPTIONS } from "@/lib/ai-models";
import { listEntries } from "@/lib/diary-db";
import {
  buildAllSummaryStats,
  buildCurrentMonthSummaryStats,
} from "@/lib/entry-utils";
import type {
  AiSummaryMode,
  AiSummaryModelId,
  AiSummarySnapshot,
  DiaryEntry,
} from "@/types/diary";

type SummaryPageProps = {
  initialEntries?: DiaryEntry[];
  initialAiSnapshots: Record<AiSummaryMode, AiSummarySnapshot>;
  aiAvailable?: boolean;
  userName?: string;
  isAdmin?: boolean;
};

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLatestReviewSnapshot(aiSnapshots: Record<AiSummaryMode, AiSummarySnapshot>) {
  const snapshots = Object.values(aiSnapshots).filter((snapshot) => snapshot.review);
  if (snapshots.length === 0) {
    return aiSnapshots.all;
  }

  return [...snapshots].sort((a, b) => {
    const aTime = a.review?.generated_at ?? "";
    const bTime = b.review?.generated_at ?? "";

    if (aTime === bTime) {
      return a.mode === "all" ? -1 : 1;
    }

    return bTime.localeCompare(aTime);
  })[0];
}

export function SummaryPage({
  initialEntries,
  initialAiSnapshots,
  aiAvailable = false,
  userName,
  isAdmin,
}: SummaryPageProps) {
  const hasInitialEntries = initialEntries !== undefined;
  const [entries, setEntries] = useState<DiaryEntry[]>(initialEntries ?? []);
  const [isLoading, setIsLoading] = useState(!hasInitialEntries);
  const [mode, setMode] = useState<"month" | "all">("month");
  const [aiSnapshots, setAiSnapshots] = useState<Record<AiSummaryMode, AiSummarySnapshot>>(
    initialAiSnapshots,
  );
  const [selectedModel, setSelectedModel] = useState<AiSummaryModelId>("gpt-4o-mini");
  const [aiError, setAiError] = useState("");
  const [generatingMode, setGeneratingMode] = useState<AiSummaryMode | null>(null);

  useEffect(() => {
    if (initialEntries === undefined) {
      return;
    }

    setEntries(initialEntries);
    setIsLoading(false);
  }, [initialEntries]);

  useEffect(() => {
    setAiSnapshots(initialAiSnapshots);
  }, [initialAiSnapshots]);

  useEffect(() => {
    setAiError("");
  }, [mode]);

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

  const stats =
    mode === "month"
      ? buildCurrentMonthSummaryStats(entries)
      : buildAllSummaryStats(entries);
  const aiSnapshot = getLatestReviewSnapshot(aiSnapshots);
  const currentReview = aiSnapshot.review;
  const isGeneratingCurrentMode = generatingMode === "all";

  async function handleGenerateAiReview() {
    setAiError("");
    setGeneratingMode("all");

    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "all",
          force: Boolean(currentReview),
          model: selectedModel,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; details?: string; snapshot?: AiSummarySnapshot }
        | null;

      if (!response.ok || !data?.snapshot) {
        throw new Error(
          data?.error
            ? [data.error, data.details].filter(Boolean).join(" ")
            : "AI 回顾生成失败，请稍后再试。",
        );
      }

      setAiSnapshots((prev) => ({
        ...prev,
        all: data.snapshot!,
      }));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI 回顾生成失败，请稍后再试。");
    } finally {
      setGeneratingMode(null);
    }
  }

  return (
    <AppShell
      title="总结"
      userName={userName}
      isAdmin={isAdmin}
      action={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("month")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "month"
                ? "bg-accent text-white shadow-[0_10px_20px_rgba(201,117,80,0.28)]"
                : "border border-border bg-white/70 text-muted hover:bg-white"
            }`}
          >
            本月
          </button>
          <button
            type="button"
            onClick={() => setMode("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "all"
                ? "bg-accent text-white shadow-[0_10px_20px_rgba(201,117,80,0.28)]"
                : "border border-border bg-white/70 text-muted hover:bg-white"
            }`}
          >
            全部
          </button>
        </div>
      }
    >

      <SectionCard title="心情统计">
        {isLoading ? (
          <p className="text-sm text-muted">正在读取本地记录...</p>
        ) : stats.entryCount === 0 ? (
          <EmptyState
            title="还没有可统计的数据"
            description="当你保存了几条真实记录后，这里会开始显示最近阶段的变化。"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] bg-white/70 p-4">
              <p className="text-sm text-muted">{stats.label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stats.entryCount}</p>
              <p className="mt-1 text-sm text-muted">已记录天数</p>
            </div>
            <div className="rounded-[22px] bg-success-soft p-4">
              <p className="text-sm text-muted">开心日</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stats.happyDays}</p>
            </div>
            <div className="rounded-[22px] bg-danger-soft p-4">
              <p className="text-sm text-muted">难过日</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stats.sadDays}</p>
            </div>
            <div className="rounded-[22px] bg-mixed-soft p-4">
              <p className="text-sm text-muted">悲喜交加日</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stats.mixedDays}</p>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="AI 回顾"
        rightSlot={
          <div className="flex flex-col gap-2 sm:items-end">
            <label className="text-xs font-medium text-muted">
              模型
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value as AiSummaryModelId)}
                className="mt-1 block min-w-[190px] rounded-[14px] border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent"
              >
                {AI_SUMMARY_MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void handleGenerateAiReview()}
              disabled={!aiAvailable || aiSnapshot.entry_count === 0 || isGeneratingCurrentMode}
              className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(201,117,80,0.28)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingCurrentMode
                ? "生成中..."
                : currentReview
                  ? "重新生成"
                  : "生成 AI 回顾"}
            </button>
          </div>
        }
      >
        {aiError ? (
          <p className="rounded-[18px] bg-danger-soft px-4 py-3 text-sm leading-6 text-[#9d4a39]">
            {aiError}
          </p>
        ) : null}

        {!currentReview && !aiAvailable ? (
          <div className="rounded-[22px] bg-card-strong p-5">
            <p className="text-base font-semibold text-foreground">还不能生成 AI 回顾</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              先在 <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs">.env.local</code> 里配置
              {" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs">OPENAI_API_KEY</code>。
            </p>
          </div>
        ) : aiSnapshot.entry_count === 0 ? (
          <EmptyState
            title="还没有可回顾的记录"
            description="先写几条日记，AI 回顾才会更有意思。"
          />
        ) : !currentReview ? (
          <div className="rounded-[22px] bg-card-strong p-5 text-sm leading-6 text-muted">
            点击右上角按钮生成 AI 回顾。
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[18px] bg-white/70 px-4 py-3 text-sm leading-6 text-muted">
              已基于全部历史记录生成，最近一次生成于 {formatGeneratedAt(currentReview.generated_at)}，
              使用模型 {currentReview.model}。
              {aiSnapshot.mode !== "all" ? " 当前展示的是上一次缓存的 AI 回顾；重新生成后会更新为基于全部历史记录的版本。" : ""}
              {!aiAvailable
                ? " 当前展示的是已缓存回顾；如需重新生成，请先配置 OPENAI_API_KEY。"
                : aiSnapshot.is_stale
                  ? " 历史记录有更新，建议重新生成。"
                  : " 当前已经是最新回顾。"}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] bg-card-strong p-4">
                <p className="text-base font-semibold text-foreground">重复出现的困惑主题</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                  {currentReview.recurring_themes.map((theme) => (
                    <li key={theme} className="rounded-[16px] bg-white/70 px-3 py-2">
                      {theme}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[22px] bg-card-strong p-4">
                <p className="text-base font-semibold text-foreground">最近最大的进步</p>
                <p className="mt-3 text-sm leading-7 text-muted">{currentReview.biggest_progress}</p>
              </div>

              <div className="rounded-[22px] bg-card-strong p-4">
                <p className="text-base font-semibold text-foreground">情绪触发器</p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-muted">
                  <div>
                    <p className="font-medium text-foreground">让你开心的常见来源</p>
                    <p className="mt-1">{currentReview.emotional_patterns.joy.join("；")}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">让你消耗的常见来源</p>
                    <p className="mt-1">{currentReview.emotional_patterns.strain.join("；")}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">最常见的困惑类型</p>
                    <p className="mt-1">{currentReview.emotional_patterns.confusion.join("；")}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] bg-accent-soft p-4">
                <p className="text-base font-semibold text-foreground">给自己的一句提醒</p>
                <p className="mt-3 text-base leading-8 text-foreground">“{currentReview.reminder}”</p>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}

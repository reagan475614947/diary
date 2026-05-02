/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EmotionBadge } from "@/components/shared/emotion-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { formatDisplayDate, getTodayDateValue } from "@/lib/date";
import { listEntries } from "@/lib/diary-db";
import { getCurrentMonthCount, getEntryPreview } from "@/lib/entry-utils";
import type { DailyPoem } from "@/lib/server-poem";
import type { DiaryEntry } from "@/types/diary";

type WeatherStatus = "idle" | "loading" | "done" | "error";
type WeatherState = { summary: string; status: WeatherStatus };
type PoemState = DailyPoem | null;

type HomeDashboardProps = {
  initialEntries?: DiaryEntry[];
  initialTime?: string;
  initialWeatherSummary?: string;
  initialPoem?: PoemState;
  userName?: string;
  isAdmin?: boolean;
};

export function HomeDashboard({
  initialEntries,
  initialTime = "",
  initialWeatherSummary = "",
  initialPoem = null,
  userName,
  isAdmin,
}: HomeDashboardProps) {
  const hasInitialEntries = initialEntries !== undefined;
  const [entries, setEntries] = useState<DiaryEntry[]>(initialEntries ?? []);
  const [isLoading, setIsLoading] = useState(!hasInitialEntries);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [weather, setWeather] = useState<WeatherState>(
    initialWeatherSummary
      ? { summary: initialWeatherSummary, status: "done" }
      : { summary: "", status: "idle" },
  );
  const [poem, setPoem] = useState<PoemState>(initialPoem);
  const [isPoemLoading, setIsPoemLoading] = useState(false);

  useEffect(() => {
    if (initialEntries === undefined) {
      return;
    }

    setEntries(initialEntries);
    setIsLoading(false);
  }, [initialEntries]);

  // Clock — updates every minute
  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${h}:${m}`);
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  // Diary entries
  useEffect(() => {
    if (hasInitialEntries) {
      return;
    }

    let isMounted = true;

    async function loadEntries() {
      try {
        const storedEntries = await listEntries();
        if (isMounted) setEntries(storedEntries);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadEntries();
    return () => {
      isMounted = false;
    };
  }, [hasInitialEntries]);

  // Weather auto-detect on mount
  useEffect(() => {
    async function detectWeather() {
      try {
        setWeather({ summary: "", status: "loading" });

        if (!navigator.geolocation) {
          setWeather({ summary: "浏览器不支持定位", status: "error" });
          return;
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 10 * 60 * 1000,
          });
        });

        const response = await fetch(
          `/api/weather/current?lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
        );
        const result = (await response.json()) as { summary?: string; error?: string };

        if (!response.ok) throw new Error(result.error ?? "获取失败");

        const summary = result.summary ?? "";
        if (!summary) {
          setWeather({ summary: "未识别到天气", status: "error" });
          return;
        }

        setWeather({ summary, status: "done" });
      } catch (error) {
        let message = "获取失败";
        if (error && typeof error === "object" && "code" in error) {
          const code = (error as GeolocationPositionError).code;
          if (code === 1) message = "未授权定位";
          else if (code === 2) message = "定位不可用";
          else if (code === 3) message = "定位超时";
        } else if (error instanceof Error && error.message) {
          message = error.message;
        }
        setWeather({ summary: message, status: "error" });
      }
    }

    void detectWeather();
  }, []);

  // Poem — fetches after weather resolves, cached in localStorage for the day
  useEffect(() => {
    if (weather.status === "idle" || weather.status === "loading") return;

    setIsPoemLoading(true);

    async function fetchPoem() {
      try {
        const todayKey = getTodayDateValue();
        let cached: string | null = null;
        try {
          cached = localStorage.getItem("diary_poem");
        } catch {
          // localStorage blocked (e.g., iOS private mode)
        }
        if (cached) {
          const parsed = JSON.parse(cached) as { date: string; poem: PoemState };
          if (parsed.date === todayKey && parsed.poem?.content) {
            setPoem(parsed.poem);
            return;
          }
        }

        const params =
          weather.status === "done" && weather.summary
            ? `?weather=${encodeURIComponent(weather.summary)}`
            : "";
        const response = await fetch(`/api/poem${params}`, {
          signal: AbortSignal.timeout(18000),
        });
        const data = (await response.json()) as {
          content?: string | null;
          title?: string;
          author?: string;
          dynasty?: string;
        };
        if (data.content) {
          const newPoem: PoemState = {
            content: data.content,
            title: data.title ?? "",
            author: data.author ?? "",
            dynasty: data.dynasty ?? "",
          };
          setPoem(newPoem);
          try {
            localStorage.setItem("diary_poem", JSON.stringify({ date: todayKey, poem: newPoem }));
          } catch {
            // localStorage blocked
          }
        }
      } catch {
        // silent fail
      } finally {
        setIsPoemLoading(false);
      }
    }

    void fetchPoem();
  }, [weather.status, weather.summary]);

  const today = formatDisplayDate(getTodayDateValue());
  const recentEntries = entries.slice(0, 3);
  const monthCount = getCurrentMonthCount(entries);

  return (
    <AppShell
      title="今天，留一点空间给自己"
      userName={userName}
      isAdmin={isAdmin}
      action={
        <Link
          href="/today"
          prefetch
          className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(201,117,80,0.28)] hover:bg-accent-strong"
        >
          记录今天
        </Link>
      }
    >
      <SectionCard title="今天">
        {/* 时间 + 天气 + 本月记录 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[22px] bg-card-strong p-5">
            <p className="text-sm font-medium text-muted">现在时间</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums text-foreground">
              {currentTime || "——"}
            </p>
            <p className="mt-2 text-sm text-muted">{today}</p>
          </div>

          <div className="rounded-[22px] bg-card-strong p-5">
            <p className="text-sm font-medium text-muted">今天天气</p>
            {weather.status === "idle" ? (
              <p className="mt-2 text-sm text-muted">等待浏览器启动后获取</p>
            ) : weather.status === "loading" ? (
              <p className="mt-2 text-sm text-muted">正在定位...</p>
            ) : weather.status === "error" ? (
              <p className="mt-2 text-sm text-muted">{weather.summary || "——"}</p>
            ) : (
              <p className="mt-2 text-base font-semibold text-foreground">{weather.summary}</p>
            )}
          </div>

          <div className="rounded-[22px] bg-card-strong p-5">
            <p className="text-sm font-medium text-muted">本月记录天数</p>
            <p className="mt-2 text-4xl font-semibold text-foreground">{monthCount}</p>
          </div>
        </div>

        {/* 今日诗词 */}
        <div className="rounded-[22px] bg-white/70 px-5 py-4">
          <p className="text-sm font-medium text-muted">今日诗词</p>
          {poem ? (
            <>
              <p className="mt-2 text-base leading-8 text-foreground">「{poem.content}」</p>
              {(poem.author || poem.title) ? (
                <p className="mt-1 text-xs text-muted">
                  {[
                    poem.dynasty && poem.author ? `${poem.dynasty} · ${poem.author}` : poem.author,
                    poem.title ? `《${poem.title}》` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              ) : null}
            </>
          ) : weather.status === "idle" || weather.status === "loading" ? (
            <p className="mt-2 text-sm text-muted">等待天气识别后加载...</p>
          ) : isPoemLoading ? (
            <p className="mt-2 text-sm text-muted">加载中...</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="最近记录"
        description="默认展示最近 3 条。"
        rightSlot={
          <Link href="/history" prefetch className="text-sm font-medium text-accent hover:text-accent-strong">
            查看全部
          </Link>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted">正在读取本地记录...</p>
        ) : recentEntries.length === 0 ? (
          <EmptyState
            title="还没有历史记录"
            description="先去写下今天的一点点内容，保存后这里就会出现最近记录预览。"
          />
        ) : (
          <div className="grid gap-3">
            {recentEntries.map((entry) => (
              <Link
                key={entry.id}
                href={`/history/${entry.id}`}
                prefetch
                className="rounded-[22px] border border-border bg-white/70 p-4 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {formatDisplayDate(entry.date)}
                    </p>
                    <EmotionBadge emotion={entry.emotion_label} />
                    <p className="text-sm leading-6 text-muted">{getEntryPreview(entry)}</p>
                  </div>
                  {entry.photo_local_path ? (
                    <div className="hidden overflow-hidden rounded-[18px] sm:block">
                      <img
                        src={entry.photo_local_path}
                        alt="记录照片预览"
                        className="h-20 w-20 object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}

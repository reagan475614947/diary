import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/shared/section-card";
import {
  AI_STYLE_OPTIONS,
  LANGUAGE_OPTIONS,
  mergeSettings,
} from "@/lib/settings";
import type { DiarySettings } from "@/types/diary";

type SettingsPageProps = {
  initialSettings?: DiarySettings | null;
  saveAction: (formData: FormData) => Promise<void>;
  saved?: boolean;
  userName?: string;
  isAdmin?: boolean;
};

export function SettingsPage({
  initialSettings = null,
  saveAction,
  saved = false,
  userName,
  isAdmin,
}: SettingsPageProps) {
  const settings = mergeSettings(initialSettings);
  const capabilityText = {
    speech: "语音输入是否可用，取决于浏览器。Mac Chrome 通常更稳定。",
    weather: "天气自动识别是否可用，取决于浏览器是否允许定位。",
  };

  return (
    <AppShell
      title="设置"
      userName={userName}
      isAdmin={isAdmin}
    >
      <form action={saveAction} className="contents">
      <SectionCard title="基本偏好">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] bg-card-strong p-5">
            <label htmlFor="preferred_language" className="block text-sm font-medium text-muted">语言偏好</label>
            <select
              id="preferred_language"
              name="preferred_language"
              defaultValue={settings.preferred_language ?? "zh-CN"}
              className="mt-3 w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-accent"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm leading-6 text-muted">
              会影响语音和 AI 的默认语言。
            </p>
          </div>

          <div className="rounded-[22px] bg-card-strong p-5">
            <label htmlFor="ai_style" className="block text-sm font-medium text-muted">AI 输出风格</label>
            <select
              id="ai_style"
              name="ai_style"
              defaultValue={settings.ai_style ?? "objective"}
              className="mt-3 w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-accent"
            >
              {AI_STYLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm leading-6 text-muted">
              后续生成日记和总结时，会优先使用这个风格。
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="记录体验" description="这里先保留最常用的几个选项。">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] bg-card-strong p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-foreground">每日提醒</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  先保存开关和时间，暂不接系统通知。
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  name="reminder_enabled"
                  value="1"
                  defaultChecked={Boolean(settings.reminder_enabled)}
                  className="h-4 w-4 rounded border-border"
                />
                开启
              </label>
            </div>

            <label htmlFor="reminder_time" className="mt-4 block text-sm font-medium text-muted">提醒时间</label>
            <input
              id="reminder_time"
              name="reminder_time"
              type="time"
              defaultValue={settings.reminder_time ?? "21:30"}
              className="mt-3 w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-accent"
            />
          </div>

          <div className="rounded-[22px] bg-card-strong p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-foreground">天气自动识别</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  打开今日记录时，会尝试定位并获取天气。
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  name="weather_auto_enabled"
                  value="1"
                  defaultChecked={Boolean(settings.weather_auto_enabled)}
                  className="h-4 w-4 rounded border-border"
                />
                开启
              </label>
            </div>

            <p className="mt-4 rounded-[18px] bg-white/70 px-4 py-3 text-sm leading-6 text-muted">
              关闭后，你仍然可以在今日记录里手动获取天气。
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="语音输入" description="如果浏览器语音不稳定，可以切换到 AI 转写。">
        <div className="rounded-[22px] bg-card-strong p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">优先使用 AI 转写</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                开启后会跳过浏览器原生语音，改用录音转写。使用前需要在
                {" "}<code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs">.env.local</code>{" "}
                里配置 <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs">OPENAI_API_KEY</code>。
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name="ai_enabled"
                value="1"
                defaultChecked={Boolean(settings.ai_enabled)}
                className="h-4 w-4 rounded border-border"
              />
              开启
            </label>
          </div>
          <p className="mt-4 rounded-[18px] bg-white/70 px-4 py-3 text-sm leading-6 text-muted">
            {capabilityText.speech}
          </p>
        </div>
      </SectionCard>

      <SectionCard title="设备状态" description="用来判断当前设备能不能用语音和定位。">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] bg-white/70 p-5">
            <p className="text-base font-semibold text-foreground">语音输入</p>
            <p className="mt-2 text-sm leading-6 text-muted">{capabilityText.speech}</p>
          </div>
          <div className="rounded-[22px] bg-white/70 p-5">
            <p className="text-base font-semibold text-foreground">天气自动识别</p>
            <p className="mt-2 text-sm leading-6 text-muted">{capabilityText.weather}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="保存设置">
        {saved ? <p className="text-sm font-medium text-[#51674b]">设置已保存。</p> : null}

        <div className="mt-5 flex">
          <button
            type="submit"
            className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(201,117,80,0.28)] hover:bg-accent-strong disabled:opacity-60"
          >
            保存设置
          </button>
        </div>
      </SectionCard>
      </form>
    </AppShell>
  );
}

import type { DiarySettings } from "@/types/diary";

export const DEFAULT_SETTINGS_ID = "default";

export const DEFAULT_SETTINGS: DiarySettings = {
  id: DEFAULT_SETTINGS_ID,
  preferred_language: "zh-CN",
  ui_theme: "warm",
  reminder_enabled: false,
  reminder_time: "21:30",
  weather_auto_enabled: true,
  ai_enabled: false,
  ai_style: "objective",
  local_lock_enabled: false,
};

export const LANGUAGE_OPTIONS = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
  { value: "browser", label: "跟随浏览器" },
];

export const AI_STYLE_OPTIONS = [
  { value: "objective", label: "客观整理型" },
  { value: "gentle", label: "温和叙述型" },
  { value: "reflection", label: "反思总结型" },
];

export function mergeSettings(settings: DiarySettings | null | undefined) {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    id: settings?.id ?? DEFAULT_SETTINGS_ID,
  };
}

export function getResolvedLanguage(preferredLanguage?: string) {
  if (preferredLanguage === "browser") {
    if (typeof navigator !== "undefined" && navigator.language) {
      return navigator.language;
    }

    return DEFAULT_SETTINGS.preferred_language ?? "zh-CN";
  }

  return preferredLanguage || DEFAULT_SETTINGS.preferred_language || "zh-CN";
}

export function getTranscriptionLanguageCode(preferredLanguage?: string) {
  const language = getResolvedLanguage(preferredLanguage).toLowerCase();

  if (language.startsWith("zh")) {
    return "zh";
  }

  if (language.startsWith("en")) {
    return "en";
  }

  return "";
}

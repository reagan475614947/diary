export type EmotionLabel = "happy" | "sad" | "mixed" | "neutral";
export type AiSummaryMode = "month" | "all";
export type AiSummaryModelId =
  | "auto"
  | "gpt-4o-mini"
  | "gpt-4.1-mini"
  | "gpt-4o"
  | "gpt-4.1";

export type DiaryEntry = {
  id: string;
  date: string;
  revision?: number;
  weekday?: string;
  weather_auto?: string;
  weather_manual?: string;
  happy_text?: string;
  sad_text?: string;
  confused_text?: string;
  photo_local_path?: string;
  voice_transcript_happy?: string;
  voice_transcript_sad?: string;
  voice_transcript_confused?: string;
  ai_diary?: string;
  emotion_label?: EmotionLabel;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type DiarySummaryStats = {
  label: string;
  entryCount: number;
  happyDays: number;
  sadDays: number;
  mixedDays: number;
  neutralDays: number;
};

export type AiSummaryReview = {
  mode: AiSummaryMode;
  model: string;
  period_label: string;
  entry_count: number;
  fingerprint: string;
  generated_at: string;
  recurring_themes: string[];
  biggest_progress: string;
  emotional_patterns: {
    joy: string[];
    strain: string[];
    confusion: string[];
  };
  reminder: string;
};

export type AiSummarySnapshot = {
  mode: AiSummaryMode;
  period_label: string;
  entry_count: number;
  current_fingerprint: string;
  review: AiSummaryReview | null;
  is_stale: boolean;
};

export type DiarySettings = {
  id: string;
  preferred_language?: string;
  ui_theme?: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
  weather_auto_enabled?: boolean;
  ai_enabled?: boolean;
  ai_style?: string;
  local_lock_enabled?: boolean;
};

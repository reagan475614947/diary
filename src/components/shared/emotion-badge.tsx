import type { EmotionLabel } from "@/types/diary";

type EmotionBadgeProps = {
  emotion?: EmotionLabel;
};

const emotionMap: Record<EmotionLabel, { label: string; className: string }> = {
  happy: {
    label: "开心日",
    className: "bg-success-soft text-foreground",
  },
  sad: {
    label: "难过日",
    className: "bg-danger-soft text-foreground",
  },
  mixed: {
    label: "悲喜交加日",
    className: "bg-mixed-soft text-foreground",
  },
  neutral: {
    label: "轻记录",
    className: "bg-white/70 text-muted",
  },
};

export function EmotionBadge({ emotion = "neutral" }: EmotionBadgeProps) {
  const badge = emotionMap[emotion];

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}

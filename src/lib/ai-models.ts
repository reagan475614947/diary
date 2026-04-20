import type { AiSummaryModelId } from "@/types/diary";

export const AI_SUMMARY_MODEL_OPTIONS: Array<{
  value: AiSummaryModelId;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "自动（推荐）",
    description: "优先尝试你的默认模型，失败时自动回退到可用小模型。",
  },
  {
    value: "gpt-4o-mini",
    label: "gpt-4o-mini",
    description: "速度快、成本低，适合日常回顾。",
  },
  {
    value: "gpt-4.1-mini",
    label: "gpt-4.1-mini",
    description: "更强的指令跟随和长上下文能力。",
  },
  {
    value: "gpt-4o",
    label: "gpt-4o",
    description: "更强的综合理解能力，通常更贵一些。",
  },
  {
    value: "gpt-4.1",
    label: "gpt-4.1",
    description: "更偏向高质量文本分析，通常更贵一些。",
  },
];

export function isAllowedAiSummaryModel(value: string): value is AiSummaryModelId {
  return AI_SUMMARY_MODEL_OPTIONS.some((option) => option.value === value);
}

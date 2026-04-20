import { getEntryWeather } from "@/lib/entry-utils";
import type { DiaryEntry } from "@/types/diary";

type DiaryPromptParams = {
  date: string;
  weather: string;
  happyText: string;
  sadText: string;
  confusedText: string;
};

export function buildDiaryPrompt({
  date,
  weather,
  happyText,
  sadText,
  confusedText,
}: DiaryPromptParams) {
  return [
    "请根据下面的日记素材，整理成一篇简短、自然、克制的中文小日记。",
    "要求：",
    "1. 只基于给定内容整理，不要编造事实。",
    "2. 语气温和、客观，不要做心理诊断。",
    "3. 长度控制在 120 到 220 字。",
    "4. 可以适度润色，但不要鸡汤化或过度总结。",
    "",
    `日期：${date}`,
    `天气：${weather || "未填写"}`,
    `开心的事：${happyText || "未填写"}`,
    `难过的事：${sadText || "未填写"}`,
    `困惑的事：${confusedText || "未填写"}`,
  ].join("\n");
}

type SummaryPromptParams = {
  periodLabel: string;
  entries: DiaryEntry[];
};

export function buildSummaryPrompt({ periodLabel, entries }: SummaryPromptParams) {
  const formattedEntries = entries
    .map((entry, index) =>
      [
        `记录 ${index + 1}`,
        `日期：${entry.date}`,
        `天气：${getEntryWeather(entry) || "未填写"}`,
        `开心：${entry.happy_text?.trim() || "未填写"}`,
        `难过：${entry.sad_text?.trim() || "未填写"}`,
        `困惑：${entry.confused_text?.trim() || "未填写"}`,
        `情绪标签：${entry.emotion_label || "未标记"}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    `请基于下面 ${periodLabel} 的日记记录，生成一份中文阶段回顾。`,
    "要求：",
    "1. 只基于给定记录分析，不要编造事实，不要做心理诊断。",
    "2. 风格克制、具体、像一个认真看完记录后给出的回顾，不要鸡汤。",
    "3. 重点分析真实重复模式、最近变化和情绪触发器。",
    "4. 请严格返回 JSON 对象，不要输出 JSON 以外的内容。",
    "5. JSON 结构必须如下：",
    '{',
    '  "recurring_themes": ["主题1", "主题2", "主题3"],',
    '  "biggest_progress": "80到140字，描述最近最明显的进步变化",',
    '  "emotional_patterns": {',
    '    "joy": ["让人开心的常见来源1", "来源2"],',
    '    "strain": ["让人难受或消耗的常见来源1", "来源2"],',
    '    "confusion": ["最常见的困惑类型1", "类型2"]',
    "  },",
    '  "reminder": "给未来自己的1句提醒，18到40字"',
    "}",
    "额外要求：",
    "1. recurring_themes 输出 2 到 4 条，每条尽量短而具体。",
    "2. emotional_patterns 三个数组各输出 1 到 3 条，尽量避免重复。",
    "3. reminder 必须像写给当事人的一句话，温和但不空泛。",
    "",
    formattedEntries,
  ].join("\n");
}

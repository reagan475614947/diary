import { isAllowedAiSummaryModel } from "@/lib/ai-models";
import { NextResponse } from "next/server";
import { buildSummaryPrompt } from "@/lib/ai-prompts";
import { getEntriesForSummaryMode } from "@/lib/entry-utils";
import {
  getAiSummarySnapshot,
  saveAiSummaryReviewToDisk,
} from "@/lib/server-ai-summary-store";
import { readEntriesFromDisk } from "@/lib/server-diary-store";
import { requireSession } from "@/lib/auth";
import type { AiSummaryMode, AiSummaryModelId, AiSummaryReview } from "@/types/diary";

type SummaryRequestBody = {
  mode?: AiSummaryMode;
  force?: boolean;
  model?: AiSummaryModelId;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type RawAiSummaryReview = {
  recurring_themes?: unknown;
  biggest_progress?: unknown;
  emotional_patterns?: {
    joy?: unknown;
    strain?: unknown;
    confusion?: unknown;
  };
  reminder?: unknown;
};

function sanitizeText(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function sanitizeItems(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  return items.length > 0 ? items : fallback;
}

function extractJsonObject(raw: string) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] ?? "";
}

function getResponseOutputText(data: OpenAIResponse) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const textParts =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text?.trim() ?? "")
      .filter(Boolean) ?? [];

  return textParts.join("\n").trim();
}

async function callOpenAiSummary({
  apiKey,
  prompt,
  requestedModel,
}: {
  apiKey: string;
  prompt: string;
  requestedModel: AiSummaryModelId;
}) {
  const modelCandidates =
    requestedModel === "auto"
      ? [
          process.env.OPENAI_SUMMARY_MODEL?.trim(),
          process.env.OPENAI_MODEL?.trim(),
          "gpt-4o-mini",
        ].filter(Boolean) as string[]
      : [requestedModel];
  const tried = new Set<string>();
  let lastErrorMessage = "";
  let lastStatus = 502;

  for (const model of modelCandidates) {
    if (tried.has(model)) {
      continue;
    }
    tried.add(model);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      const data = (await response.json()) as OpenAIResponse;
      return {
        model,
        data,
      };
    }

    const errorText = await response.text();
    lastErrorMessage = errorText;
    lastStatus = response.status;

    const shouldFallback =
      requestedModel === "auto" &&
      response.status === 404 ||
      (requestedModel === "auto" && errorText.includes("model_not_found")) ||
      (requestedModel === "auto" && errorText.includes("must be verified to use the model"));

    if (shouldFallback) {
      continue;
    }

    return {
      model,
      errorText,
      status: response.status,
    };
  }

  return {
    model: [...tried].at(-1) ?? "unknown",
    errorText: lastErrorMessage,
    status: lastStatus,
  };
}

export async function POST(request: Request) {
  const session = await requireSession();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_openai_api_key") {
    return NextResponse.json(
      {
        error: "未配置 OPENAI_API_KEY，当前不能生成 AI 回顾。",
      },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as SummaryRequestBody;
  const mode: AiSummaryMode = body.mode === "all" ? "all" : "month";
  const requestedModel: AiSummaryModelId =
    typeof body.model === "string" && isAllowedAiSummaryModel(body.model) ? body.model : "auto";
  const allEntries = await readEntriesFromDisk(session.userId);
  const snapshot = await getAiSummarySnapshot(session.userId, mode, allEntries);

  if (snapshot.entry_count === 0) {
    return NextResponse.json(
      {
        error: "当前还没有可用于总结的记录。",
      },
      { status: 400 },
    );
  }

  if (!body.force && snapshot.review && !snapshot.is_stale) {
    return NextResponse.json({ snapshot });
  }

  const scopedEntries = getEntriesForSummaryMode(allEntries, mode);
  const prompt = buildSummaryPrompt({
    periodLabel: snapshot.period_label,
    entries: scopedEntries,
  });

  const openAiResult = await callOpenAiSummary({
    apiKey,
    prompt,
    requestedModel,
  });

  if ("errorText" in openAiResult) {
    const selectedModelMessage =
      requestedModel === "auto"
        ? "AI 回顾生成失败，请稍后再试。"
        : `所选模型 ${requestedModel} 当前不可用，请改用自动或 gpt-4o-mini。`;
    return NextResponse.json(
      {
        error: selectedModelMessage,
        details: openAiResult.errorText,
      },
      { status: openAiResult.status },
    );
  }

  const data = openAiResult.data;
  const raw = getResponseOutputText(data);
  const jsonText = extractJsonObject(raw);

  if (!jsonText) {
    return NextResponse.json(
      {
        error: "AI 返回内容无法解析成结构化回顾。",
      },
      { status: 502 },
    );
  }

  let parsed: RawAiSummaryReview;
  try {
    parsed = JSON.parse(jsonText) as RawAiSummaryReview;
  } catch {
    return NextResponse.json(
      {
        error: "AI 返回的 JSON 解析失败。",
      },
      { status: 502 },
    );
  }

  const review: AiSummaryReview = {
    mode,
    model: openAiResult.model,
    period_label: snapshot.period_label,
    entry_count: snapshot.entry_count,
    fingerprint: snapshot.current_fingerprint,
    generated_at: new Date().toISOString(),
    recurring_themes: sanitizeItems(parsed.recurring_themes, ["当前记录里还没有足够清晰的重复主题。"]),
    biggest_progress: sanitizeText(
      parsed.biggest_progress,
      "当前记录还不足以提炼出稳定的阶段进步，可以再积累几天看看。",
    ),
    emotional_patterns: {
      joy: sanitizeItems(parsed.emotional_patterns?.joy, ["开心通常来自把事情真正推进了一点。"]),
      strain: sanitizeItems(parsed.emotional_patterns?.strain, ["难受多半来自拖延、比较或计划落空。"]),
      confusion: sanitizeItems(parsed.emotional_patterns?.confusion, ["最近的困惑还在形成阶段，值得继续观察。"]),
    },
    reminder: sanitizeText(
      parsed.reminder,
      "先把注意力放回今天手上的一小步，不必一次想完所有答案。",
    ),
  };

  await saveAiSummaryReviewToDisk(session.userId, review);

  return NextResponse.json({
    snapshot: {
      ...snapshot,
      review,
      is_stale: false,
    },
  });
}

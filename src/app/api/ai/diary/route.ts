import { NextResponse } from "next/server";
import { buildDiaryPrompt } from "@/lib/ai-prompts";
import { requireSession } from "@/lib/auth";

type DiaryRequestBody = {
  date?: string;
  weather?: string;
  happyText?: string;
  sadText?: string;
  confusedText?: string;
};

export async function POST(request: Request) {
  await requireSession();

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置 OPENAI_API_KEY，当前不能生成 AI 日记。" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as DiaryRequestBody;
  const prompt = buildDiaryPrompt({
    date: body.date ?? "",
    weather: body.weather ?? "",
    happyText: body.happyText ?? "",
    sadText: body.sadText ?? "",
    confusedText: body.confusedText ?? "",
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "AI 日记生成失败。", details: errorText },
      { status: response.status },
    );
  }

  const data = (await response.json()) as { output_text?: string };
  return NextResponse.json({ diary: data.output_text?.trim() ?? "" });
}

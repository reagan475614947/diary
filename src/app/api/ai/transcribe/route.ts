import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function POST(request: Request) {
  await requireSession();

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe";

  if (!apiKey) {
    return NextResponse.json(
      { error: "当前未配置 OPENAI_API_KEY，无法进行语音转写。" },
      { status: 400 },
    );
  }

  const incomingFormData = await request.formData();
  const file = incomingFormData.get("file");
  const language = incomingFormData.get("language");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "没有收到可用的音频文件。" }, { status: 400 });
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", model);
  formData.append("response_format", "json");
  if (typeof language === "string" && language.trim()) {
    formData.append("language", language.trim());
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "语音转写失败。", details: errorText },
      { status: response.status },
    );
  }

  const data = (await response.json()) as { text?: string };
  return NextResponse.json({ transcript: data.text?.trim() ?? "" });
}

export type DailyPoem = {
  content: string;
  title: string;
  author: string;
  dynasty: string;
};

type JinrishiciResponse = {
  content?: string;
  origin?: {
    title?: string;
    dynasty?: string;
    author?: string;
  };
};

type OpenAIResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

async function fetchFromJinrishici(): Promise<DailyPoem | null> {
  try {
    const response = await fetch("https://v1.jinrishici.com/all.json", {
      cache: "no-store",
      headers: { "User-Agent": "diary-app/1.0" },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as JinrishiciResponse;

    return {
      content: data.content ?? "",
      title: data.origin?.title ?? "",
      author: data.origin?.author ?? "",
      dynasty: data.origin?.dynasty ?? "",
    };
  } catch {
    return null;
  }
}

async function fetchFromOpenAI(weather: string): Promise<DailyPoem | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key") {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `当前天气：${weather}。请从中国古典诗词（唐诗宋词均可）中选一句最符合当前天气意境的名句，用JSON格式返回，格式如下：{"content":"诗句","title":"诗名","author":"作者","dynasty":"朝代"}。只返回JSON对象，不要其他任何内容。`,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenAIResponse;
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]) as DailyPoem;
  } catch {
    return null;
  }
}

export async function fetchDailyPoem(weather = ""): Promise<DailyPoem | null> {
  if (weather) {
    const poem = await fetchFromOpenAI(weather);
    if (poem?.content) {
      return poem;
    }
  }

  const fallback = await fetchFromJinrishici();
  if (fallback?.content) {
    return fallback;
  }

  return null;
}

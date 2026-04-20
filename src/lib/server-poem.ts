import fs from "fs/promises";
import path from "path";

export type DailyPoem = {
  content: string;
  title: string;
  author: string;
  dynasty: string;
};

const CACHE_PATH = path.join(process.cwd(), "diary-data", "daily-poem.json");

type PoemCache = {
  date: string;
  poem: DailyPoem;
};

async function readCache(): Promise<DailyPoem | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    const cache = JSON.parse(raw) as PoemCache;
    const today = new Date().toISOString().slice(0, 10);
    if (cache.date === today && cache.poem?.content) {
      return cache.poem;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCache(poem: DailyPoem): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify({ date: today, poem }, null, 2), "utf-8");
}

type JinrishiciResponse = {
  content?: string;
  origin?: {
    title?: string;
    dynasty?: string;
    author?: string;
  };
};

async function fetchFromJinrishici(): Promise<DailyPoem | null> {
  try {
    const response = await fetch("https://v1.jinrishici.com/all.json", {
      cache: "no-store",
      headers: { "User-Agent": "diary-app/1.0" },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as JinrishiciResponse;
    const author = data.origin?.author ?? "";
    const dynasty = data.origin?.dynasty ?? "";
    const title = data.origin?.title ?? "";
    const content = data.content ?? "";

    if (!content || !author) return null;

    return { content, title, author, dynasty };
  } catch {
    return null;
  }
}

async function fetchFromOpenAI(weather: string): Promise<DailyPoem | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key") return null;

  try {
    const prompt = weather
      ? `当前天气：${weather}。请从中国古典诗词中选一句符合意境的名句`
      : "请随机选一句中国古典诗词名句";

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
            content: `${prompt}，用JSON格式返回，格式如下：{"content":"诗句","title":"诗名","author":"作者","dynasty":"朝代"}。只返回JSON对象，不要其他任何内容。`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as DailyPoem;
    if (!parsed.content || !parsed.author) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchDailyPoem(weather = ""): Promise<DailyPoem | null> {
  // 先查今天的缓存
  const cached = await readCache();
  if (cached) return cached;

  // 没有缓存才去获取
  let poem: DailyPoem | null = null;

  if (weather) {
    poem = await fetchFromOpenAI(weather);
  }

  if (!poem) {
    poem = await fetchFromJinrishici();
  }

  if (!poem) {
    poem = await fetchFromOpenAI("");
  }

  // 缓存今天的诗
  if (poem) {
    await writeCache(poem).catch(() => undefined);
  }

  return poem;
}

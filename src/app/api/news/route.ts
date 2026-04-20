import { NextResponse } from "next/server";

type NewsItem = {
  title: string;
  link: string;
};

function parseFirstItem(xml: string): NewsItem | null {
  const itemMatch = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/);
  if (!itemMatch) return null;

  const item = itemMatch[1];
  const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
  const linkMatch = item.match(/<link>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/link>/);

  const title = titleMatch?.[1]?.trim() ?? "";
  const link = linkMatch?.[1]?.trim() ?? "";

  return title ? { title, link } : null;
}

async function fetchNews(url: string): Promise<NewsItem | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "diary-app/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const xml = await response.text();
    return parseFirstItem(xml);
  } catch {
    return null;
  }
}

export async function GET() {
  const [domestic, international] = await Promise.all([
    fetchNews("https://rss.sina.com.cn/news/china/focus15.xml"),
    fetchNews("https://rss.sina.com.cn/news/world/focus15.xml"),
  ]);

  return NextResponse.json({ domestic, international });
}

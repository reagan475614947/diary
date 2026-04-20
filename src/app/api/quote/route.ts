import { NextResponse } from "next/server";

type HitokotoResponse = {
  hitokoto: string;
  from?: string;
  from_who?: string;
};

export async function GET() {
  try {
    const response = await fetch("https://v1.hitokoto.cn/?encode=json", {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return NextResponse.json({ quote: null });
    }

    const data = (await response.json()) as HitokotoResponse;

    return NextResponse.json({
      quote: data.hitokoto ?? null,
      from: data.from ?? null,
      author: data.from_who ?? null,
    });
  } catch {
    return NextResponse.json({ quote: null });
  }
}

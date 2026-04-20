import { NextResponse } from "next/server";
import { fetchDailyPoem } from "@/lib/server-poem";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weather = searchParams.get("weather") ?? "";
  const poem = await fetchDailyPoem(weather);
  if (poem?.content) return NextResponse.json(poem);

  return NextResponse.json({ content: null });
}

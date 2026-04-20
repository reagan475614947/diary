import { NextResponse } from "next/server";
import type { DiarySettings } from "@/types/diary";
import { requireSession } from "@/lib/auth";
import { readSettingsFromDisk, saveSettingsToDisk } from "@/lib/server-diary-store";

export async function GET() {
  const session = await requireSession();
  const settings = await readSettingsFromDisk(session.userId);
  if (!settings) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const session = await requireSession();
  const settings = (await request.json()) as DiarySettings;
  await saveSettingsToDisk(session.userId, settings);
  return NextResponse.json({ ok: true });
}

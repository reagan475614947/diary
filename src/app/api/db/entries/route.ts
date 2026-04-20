import { NextResponse } from "next/server";
import type { DiaryEntry } from "@/types/diary";
import { requireSession } from "@/lib/auth";
import {
  readEntriesFromDisk,
  readEntryByDateFromDisk,
  saveEntryToDisk,
} from "@/lib/server-diary-store";

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (date) {
    const found = await readEntryByDateFromDisk(session.userId, date);
    if (!found) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(found);
  }

  const entries = await readEntriesFromDisk(session.userId);
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const session = await requireSession();
  const entry = (await request.json()) as DiaryEntry;
  await saveEntryToDisk(session.userId, entry);
  return NextResponse.json({ ok: true });
}

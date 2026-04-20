import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { readEntryByIdFromDisk } from "@/lib/server-diary-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  const { id } = await params;
  const entry = await readEntryByIdFromDisk(session.userId, id);
  if (!entry) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(entry);
}

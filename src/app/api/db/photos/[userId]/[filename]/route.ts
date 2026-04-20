import fs from "fs/promises";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPhotoFilePath } from "@/lib/server-diary-store";

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string; filename: string }> },
) {
  const session = await requireSession();
  const { userId, filename } = await params;

  if (session.userId !== userId && !session.isAdmin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeName || safeName !== filename) {
    return NextResponse.json({ error: "无效文件名" }, { status: 400 });
  }

  try {
    const filePath = await getPhotoFilePath(userId, safeName);
    const buffer = await fs.readFile(filePath);
    const ext = safeName.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, { headers: { "Content-Type": contentType } });
  } catch {
    return NextResponse.json({ error: "照片不存在" }, { status: 404 });
  }
}

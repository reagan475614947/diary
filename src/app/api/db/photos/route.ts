import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { saveUploadedPhotoToDisk } from "@/lib/server-diary-store";
import { MAX_PHOTO_UPLOAD_BYTES, MAX_PHOTO_UPLOAD_MB } from "@/lib/upload";

export async function POST(request: Request) {
  const session = await requireSession();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  if (file.size > MAX_PHOTO_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `照片不能超过 ${MAX_PHOTO_UPLOAD_MB}MB。` },
      { status: 413 },
    );
  }

  const url = await saveUploadedPhotoToDisk(session.userId, file);
  return NextResponse.json({ url });
}

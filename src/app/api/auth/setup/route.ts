import { NextResponse } from "next/server";
import { getAllUsers, createUser } from "@/lib/users";
import { createSession } from "@/lib/auth";

// 仅在没有任何用户时可用，用于首次初始化管理员账号
export async function POST(request: Request) {
  const users = await getAllUsers();
  if (users.length > 0) {
    return NextResponse.json({ error: "已存在用户，无法使用此接口" }, { status: 403 });
  }

  const { email, name, password } = (await request.json()) as {
    email?: string;
    name?: string;
    password?: string;
  };

  if (!email || !name || !password) {
    return NextResponse.json({ error: "请填写所有字段" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
  }

  const user = await createUser({ email, name, password, isAdmin: true });
  await createSession({ userId: user.id, email: user.email, name: user.name, isAdmin: true });

  return NextResponse.json({ ok: true });
}

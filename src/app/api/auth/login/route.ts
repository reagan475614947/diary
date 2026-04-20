import { NextResponse } from "next/server";
import { findUserByEmail, verifyPassword } from "@/lib/users";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }

    const valid = await verifyPassword(user, password);
    if (!valid) {
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 });
  }
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        name: formData.get("name"),
        password: formData.get("password"),
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "设置失败");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">姓名</label>
        <input name="name" required className="w-full rounded-xl border border-border bg-card-strong px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="你的名字" />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">邮箱</label>
        <input name="email" type="email" required className="w-full rounded-xl border border-border bg-card-strong px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="your@email.com" />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">密码</label>
        <input name="password" type="password" required minLength={8} className="w-full rounded-xl border border-border bg-card-strong px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="至少 8 位" />
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(201,117,80,0.28)] transition hover:bg-accent-strong disabled:opacity-60">
        {loading ? "创建中…" : "创建管理员账号"}
      </button>
    </form>
  );
}

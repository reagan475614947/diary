"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-card-strong hover:text-foreground disabled:opacity-60"
    >
      {loading ? "…" : "退出"}
    </button>
  );
}

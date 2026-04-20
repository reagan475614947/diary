import { connection } from "next/server";
import Link from "next/link";
import { requireAdminSession } from "@/lib/auth";
import { getAllUsers } from "@/lib/users";
import { readEntriesFromDisk } from "@/lib/server-diary-store";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminPage() {
  await connection();
  const session = await requireAdminSession();
  const users = await getAllUsers();
  const userEntries = await Promise.all(
    users.map(async (user) => {
      const entries = await readEntriesFromDisk(user.id);
      return { user, entryCount: entries.length, latestEntry: entries[0] ?? null };
    }),
  );

  return (
    <AppShell title="管理后台" description="查看所有用户及其日记数据" userName={session.name} isAdmin={session.isAdmin}>
      <div className="rounded-[20px] border border-border bg-card p-6 shadow-[0_8px_30px_rgba(109,85,70,0.06)]">
        <h2 className="mb-4 text-lg font-semibold text-foreground">用户列表</h2>
        <div className="space-y-3">
          {userEntries.map(({ user, entryCount, latestEntry }) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card-strong px-4 py-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{user.name}</span>
                  {user.isAdmin && (
                    <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      管理员
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">{user.email}</p>
                <p className="text-xs text-muted">
                  {entryCount} 条日记
                  {latestEntry ? `，最近：${latestEntry.date}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-card hover:text-foreground"
                >
                  查看日记
                </Link>
              </div>
            </div>
          ))}
          {userEntries.length === 0 && (
            <p className="text-center text-sm text-muted py-8">暂无用户</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

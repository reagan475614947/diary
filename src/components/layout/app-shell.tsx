import type { ReactNode } from "react";
import { MainNav } from "@/components/layout/main-nav";
import { LogoutButton } from "@/components/auth/logout-button";

type AppShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  userName?: string;
  isAdmin?: boolean;
};

export function AppShell({ title, description, children, action, userName, isAdmin }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-[28px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(109,85,70,0.08)] backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {description ? <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">{description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {action}
            {userName && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{userName}</span>
                {isAdmin && (
                  <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                    管理员
                  </span>
                )}
                <LogoutButton />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4">{children}</main>

      <MainNav isAdmin={isAdmin} />
    </div>
  );
}

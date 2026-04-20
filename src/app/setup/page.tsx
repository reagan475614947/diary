import { Suspense } from "react";
import { SetupForm } from "@/components/auth/setup-form";

export default function SetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">初始化设置</h1>
          <p className="mt-2 text-sm text-muted">创建第一个管理员账号</p>
        </div>
        <div className="rounded-[28px] border border-border bg-card p-8 shadow-[0_20px_60px_rgba(109,85,70,0.08)] backdrop-blur">
          <Suspense>
            <SetupForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

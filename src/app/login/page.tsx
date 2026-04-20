import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">AI 日记</h1>
          <p className="mt-2 text-sm text-muted">登录以访问你的日记</p>
        </div>

        <div className="rounded-[28px] border border-border bg-card p-8 shadow-[0_20px_60px_rgba(109,85,70,0.08)] backdrop-blur">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

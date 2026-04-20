import type { Metadata } from "next";
import "./globals.css";
import { MigrationGuard } from "@/components/migration-guard";

export const metadata: Metadata = {
  title: "AI 日记 App MVP",
  description: "本地优先的 AI 日记 App MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <MigrationGuard>{children}</MigrationGuard>
      </body>
    </html>
  );
}

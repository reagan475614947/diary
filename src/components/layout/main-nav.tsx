"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseNavItems = [
  { href: "/", label: "首页" },
  { href: "/today", label: "今天" },
  { href: "/history", label: "历史" },
  { href: "/summary", label: "总结" },
];

type MainNavProps = {
  isAdmin?: boolean;
};

export function MainNav({ isAdmin }: MainNavProps) {
  const pathname = usePathname();
  const navItems = isAdmin
    ? [...baseNavItems, { href: "/admin", label: "管理" }]
    : baseNavItems;

  return (
    <nav className="fixed inset-x-0 bottom-5 z-20 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between rounded-full border border-border bg-[rgba(255,253,249,0.88)] px-3 py-3 shadow-[0_18px_40px_rgba(95,74,60,0.12)] backdrop-blur sm:w-full">
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={`flex min-w-[60px] items-center justify-center rounded-full px-3 py-2 text-sm font-medium ${
              isActive
                ? "bg-accent text-white shadow-[0_10px_20px_rgba(201,117,80,0.28)]"
                : "text-muted hover:bg-white/70 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

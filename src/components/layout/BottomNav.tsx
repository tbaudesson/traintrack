"use client";

import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Home, Dumbbell, TrendingUp, Apple, Menu } from "lucide-react";

const TABS = [
  { id: "home", href: "/", icon: Home, key: "home" },
  { id: "log", href: "/log", icon: Dumbbell, key: "log" },
  { id: "nutrition", href: "/nutrition", icon: Apple, key: "nutrition" },
  { id: "progress", href: "/progress", icon: TrendingUp, key: "progress" },
  { id: "more", href: "/more", icon: Menu, key: "more" },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm safe-area-pb dark:border-gray-800 dark:bg-gray-900/95"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {TABS.map(({ id, href, icon: Icon, key }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                isActive
                  ? "text-indigo-600"
                  : "text-gray-500 active:text-indigo-500 dark:text-gray-400"
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("h-6 w-6", isActive && "fill-indigo-100")}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className="font-medium">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

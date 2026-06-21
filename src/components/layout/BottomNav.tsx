"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { NAV_CATALOG, getNavItemIds } from "@/lib/navConfig";
import {
  Home, Dumbbell, TrendingUp, Apple, Menu, ListChecks, ClipboardList,
  Users, HeartPulse, Trophy, Flag, MessageCircle, Activity, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Home, Dumbbell, TrendingUp, Apple, Menu, ListChecks, ClipboardList, Users, HeartPulse, Trophy, Flag, MessageCircle, Activity,
};

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { hasFeature } = useFeatureAccess();
  const [ids, setIds] = useState<string[]>(() => getNavItemIds());

  useEffect(() => {
    const sync = () => setIds(getNavItemIds());
    window.addEventListener("navitemschange", sync);
    return () => window.removeEventListener("navitemschange", sync);
  }, []);

  const items = ids
    .map((id) => NAV_CATALOG.find((n) => n.id === id))
    .filter((n): n is (typeof NAV_CATALOG)[number] => !!n)
    .filter((n) => !n.feature || hasFeature(n.feature));

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm safe-area-pb dark:border-gray-800 dark:bg-gray-900/95"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {items.map(({ id, href, icon, key }) => {
          const Icon = ICONS[icon] ?? Home;
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                isActive
                  ? "text-accent-600"
                  : "text-gray-500 active:text-accent-500 dark:text-gray-400"
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("h-6 w-6", isActive && "fill-accent-100")}
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

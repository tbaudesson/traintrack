import type { FeatureKey } from "@/lib/adminService";

export interface NavItemDef {
  id: string;
  href: string;
  icon: string; // lucide icon name (resolved in BottomNav)
  key: string; // translation key in "nav"
  feature?: FeatureKey;
}

// All destinations that may appear in the bottom bar.
export const NAV_CATALOG: NavItemDef[] = [
  { id: "home", href: "/", icon: "Home", key: "home" },
  { id: "log", href: "/log", icon: "Dumbbell", key: "log" },
  { id: "nutrition", href: "/nutrition", icon: "Apple", key: "nutrition", feature: "nutrition" },
  { id: "progress", href: "/progress", icon: "TrendingUp", key: "progress" },
  { id: "exercises", href: "/exercises", icon: "ListChecks", key: "exercises" },
  { id: "programs", href: "/programs", icon: "ClipboardList", key: "programs" },
  { id: "teams", href: "/teams", icon: "Users", key: "teams" },
  { id: "readiness", href: "/readiness", icon: "HeartPulse", key: "readiness", feature: "readiness" },
  { id: "profile", href: "/profile", icon: "Trophy", key: "profile" },
  { id: "more", href: "/more", icon: "Menu", key: "more" },
];

export const MAX_NAV_ITEMS = 5;
const DEFAULT_IDS = ["home", "log", "nutrition", "progress", "more"];
const KEY = "traintrack.navItems";

export function getNavItemIds(): string[] {
  if (typeof window === "undefined") return DEFAULT_IDS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const ids = JSON.parse(raw) as string[];
      if (Array.isArray(ids) && ids.length > 0) return ids.slice(0, MAX_NAV_ITEMS);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_IDS;
}

export function setNavItemIds(ids: string[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX_NAV_ITEMS)));
  window.dispatchEvent(new Event("navitemschange"));
}

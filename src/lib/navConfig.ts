import type { FeatureKey } from "@/lib/adminService";

export interface NavItemDef {
  id: string;
  href: string;
  icon: string; // lucide icon name (resolved in BottomNav)
  key: string; // translation key in "nav"
  feature?: FeatureKey;
}

// All destinations that may appear on the menu wheel.
export const NAV_CATALOG: NavItemDef[] = [
  { id: "home", href: "/", icon: "Home", key: "home" },
  { id: "log", href: "/log", icon: "Dumbbell", key: "log" },
  { id: "nutrition", href: "/nutrition", icon: "Apple", key: "nutrition", feature: "nutrition" },
  { id: "progress", href: "/progress", icon: "TrendingUp", key: "progress" },
  { id: "exercises", href: "/exercises", icon: "ListChecks", key: "exercises" },
  { id: "programs", href: "/programs", icon: "ClipboardList", key: "programs" },
  { id: "teams", href: "/teams", icon: "Users", key: "teams" },
  { id: "activity", href: "/activity", icon: "Newspaper", key: "activity", feature: "coaching" },
  { id: "challenges", href: "/challenges", icon: "Flag", key: "challenges" },
  { id: "health", href: "/health", icon: "Activity", key: "health" },
  { id: "readiness", href: "/readiness", icon: "HeartPulse", key: "readiness", feature: "readiness" },
  { id: "profile", href: "/profile", icon: "Trophy", key: "profile" },
  { id: "more", href: "/more", icon: "Menu", key: "more" },
];

// "more" is mandatory — it's the entry point to profile/settings/admin.
export const LOCKED_NAV_ID = "more";
/** Home is the medallion in the middle of the wheel, not a section on it. */
export const HOME_NAV_ID = "home";
/** The sections that may sit on the wheel. */
export const WHEEL_CATALOG = NAV_CATALOG.filter((n) => n.id !== HOME_NAV_ID);
const DEFAULT_ORDER = ["log", "nutrition", "progress", "more"];
/** The order of the sections on the wheel, and those left off it. */
const KEY = "traintrack.navWheel";
/** Before the wheel: up to five sections of the old bottom bar, put first. */
const LEGACY_KEY = "traintrack.navItems";

const CATALOG_IDS = WHEEL_CATALOG.map((n) => n.id);
const isNavId = (id: unknown): id is string => typeof id === "string" && CATALOG_IDS.includes(id);
const navIds = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isNavId) : []);

/**
 * Every section, in the order given first, then the rest; without those left
 * off. "More" is never left off, and at least one other section stays.
 */
export function arrangeNav(order: string[], hidden: string[] = []): string[] {
  const all = [...new Set([...order.filter(isNavId), ...CATALOG_IDS])];
  const shown = all.filter((id) => id === LOCKED_NAV_ID || !hidden.includes(id));
  return shown.some((id) => id !== LOCKED_NAV_ID) ? shown : all;
}

const DEFAULT_SHOWN = arrangeNav(DEFAULT_ORDER);

/** The sections on the wheel, in order, "more" included. */
export function getNavItemIds(): string[] {
  if (typeof window === "undefined") return DEFAULT_SHOWN;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return arrangeNav(navIds(saved?.order), navIds(saved?.hidden));
    }
    // Sections added to the app later show up on their own: only those left off are stored.
    const legacy = navIds(JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? "null"));
    return arrangeNav(legacy.length > 0 ? legacy : DEFAULT_ORDER);
  } catch {
    return DEFAULT_SHOWN;
  }
}

/** Put these sections on the wheel, in this order; the others are left off. */
export function setNavItemIds(ids: string[]): void {
  const order = arrangeNav(ids, CATALOG_IDS.filter((id) => !ids.includes(id)));
  const hidden = CATALOG_IDS.filter((id) => !order.includes(id));
  window.localStorage.setItem(KEY, JSON.stringify({ order, hidden }));
  window.dispatchEvent(new Event("navitemschange"));
}

export function resetNavItemIds(): string[] {
  setNavItemIds(DEFAULT_SHOWN);
  return [...DEFAULT_SHOWN];
}

import type { FeatureKey, UserRole } from "@/lib/adminService";
import type { FavoriteSport } from "@/lib/appTheme";

export type NavigationSectionId = "train" | "performance" | "coaching" | "profileAdmin";

export interface NavItemDef {
  id: string;
  href: string;
  icon: string;
  /** Translation key in the `nav` namespace. */
  key: string;
  feature?: FeatureKey;
  roles?: UserRole[];
}

export interface NavigationSectionDef extends NavItemDef {
  id: NavigationSectionId;
  children: readonly NavItemDef[];
}

/** Two levels only: four universes, each with no more than six destinations. */
export const NAVIGATION_CATALOG: readonly NavigationSectionDef[] = [
  {
    id: "train", href: "/", icon: "Dumbbell", key: "sectionTrain", children: [
      { id: "today", href: "/", icon: "CalendarCheck", key: "todaySession" },
      { id: "programs", href: "/programs", icon: "ClipboardList", key: "programs" },
      { id: "exercises", href: "/exercises", icon: "ListChecks", key: "exercises" },
      { id: "sports", href: "/more", icon: "Bike", key: "sports" },
      { id: "history", href: "/history", icon: "History", key: "history" },
      { id: "import", href: "/settings?section=import", icon: "FileUp", key: "import", feature: "excel_import" },
    ],
  },
  {
    id: "performance", href: "/progress", icon: "TrendingUp", key: "sectionPerformance", children: [
      { id: "progress", href: "/progress", icon: "TrendingUp", key: "progress" },
      { id: "assistant", href: "/assistant", icon: "Sparkles", key: "assistant" },
      { id: "readiness", href: "/readiness", icon: "HeartPulse", key: "fitness", feature: "readiness" },
      { id: "health", href: "/health", icon: "Activity", key: "health" },
      { id: "nutrition", href: "/nutrition", icon: "Apple", key: "nutrition", feature: "nutrition" },
      { id: "challenges", href: "/challenges", icon: "Flag", key: "challenges", feature: "challenges" },
    ],
  },
  {
    id: "coaching", href: "/teams", icon: "Users", key: "sectionCoaching", feature: "coaching", children: [
      { id: "teams", href: "/teams", icon: "Users", key: "teams", feature: "coaching" },
      { id: "athletes", href: "/coach", icon: "UserRound", key: "athletes", feature: "coaching" },
      { id: "assignments", href: "/programs?view=assigned", icon: "ClipboardCheck", key: "assignments", feature: "coaching" },
      { id: "messages", href: "/messages", icon: "MessageCircle", key: "messages", feature: "coaching" },
      { id: "requests", href: "/activity", icon: "Inbox", key: "requests", feature: "coaching" },
      // Tennis groups: teams without accounts, a coach's notebook (migrations 088, 089).
      { id: "tennis", href: "/tennis", icon: "ClipboardPen", key: "tennis", feature: "tennis" },
    ],
  },
  {
    id: "profileAdmin", href: "/profile", icon: "UserRoundCog", key: "sectionProfileAdmin", children: [
      { id: "profile", href: "/profile", icon: "Trophy", key: "profile" },
      { id: "notifications", href: "/settings?section=notifications", icon: "Bell", key: "notifications" },
      { id: "admin", href: "/admin", icon: "ShieldCheck", key: "administration", roles: ["admin"] },
      { id: "layouts", href: "/settings?section=appearance", icon: "PanelsTopLeft", key: "layouts" },
      { id: "settings", href: "/settings", icon: "Settings", key: "settings" },
    ],
  },
] as const;

/** Where one's sport is trained: these stand in the wheel for the generic "Sports" entry. */
export const SPORT_DESTINATIONS: Partial<Record<FavoriteSport, readonly NavItemDef[]>> = {
  running: [{ id: "running", href: "/running", icon: "Footprints", key: "running", feature: "running" }],
  callisthenics: [{ id: "intervals", href: "/intervals", icon: "Timer", key: "intervals" }],
  hiking: [{ id: "outingChecklist", href: "/outing-checklist", icon: "ListChecks", key: "outingChecklist" }],
  swimming: [{ id: "swimTechniques", href: "/swim-techniques", icon: "Waves", key: "swimTechniques" }],
  vaulting: [
    { id: "competitions", href: "/competitions", icon: "Award", key: "competitions", feature: "vaulting" },
    { id: "horses", href: "/horses", icon: "PawPrint", key: "horses", feature: "vaulting" },
  ],
};
const SPORT_ITEMS = Object.values(SPORT_DESTINATIONS).flat();
const MAX_CHILDREN = 6;

/**
 * The training section for one's sports: their own pages right after today's
 * session, in place of "Sports" (the generic list, still under Connections).
 * A sport without pages of its own (or none the licence opens), or none
 * chosen, keeps the usual section.
 */
function withSports(section: NavigationSectionDef, sports: readonly (FavoriteSport | null | undefined)[], access: NavigationAccess): NavigationSectionDef {
  if (section.id !== "train") return section;
  const own = [...new Set(sports.flatMap((sport) => (sport ? SPORT_DESTINATIONS[sport] ?? [] : [])))].filter((item) => canAccessNavigation(item, access));
  if (!own.length) return section;
  const [today, ...rest] = section.children;
  return { ...section, children: [today, ...own, ...rest.filter((item) => item.id !== "sports")] };
}

export interface NavigationAccess {
  role?: UserRole;
  features?: readonly string[];
  isAdmin?: boolean;
}

export function canAccessNavigation(item: Pick<NavItemDef, "feature" | "roles">, access: NavigationAccess): boolean {
  if (access.isAdmin || access.role === "admin") return true;
  if (item.roles && !item.roles.includes(access.role ?? "user")) return false;
  return !item.feature || !!access.features?.includes(item.feature);
}

/**
 * The sections and entries one can open. `shown` leaves out the entries one's
 * display mode keeps for later (lib/displayMode); a section left without any
 * entry goes too.
 */
export function navigationForAccess(
  access: NavigationAccess,
  sports: readonly (FavoriteSport | null | undefined)[] = [],
  shown: (item: NavItemDef) => boolean = () => true,
): NavigationSectionDef[] {
  return NAVIGATION_CATALOG
    .filter((section) => canAccessNavigation(section, access))
    .map((section) => withSports(section, sports, access))
    .map((section) => ({ ...section, children: section.children.filter((item) => canAccessNavigation(item, access) && shown(item)).slice(0, MAX_CHILDREN) }))
    .filter((section) => section.children.length > 0);
}

/**
 * The one item of a section that the page belongs to, so only one is ever
 * current. Several items may share an address until each has its own screen:
 * the item named after the page stands for it (Settings for /settings),
 * otherwise the first of them in the section's order.
 */
export function currentItemId(section: Pick<NavigationSectionDef, "children">, pathname: string): string | undefined {
  const matching = section.children.filter((item) => {
    const href = pagePath(item.href);
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  });
  if (!matching.length) return undefined;
  const longest = Math.max(...matching.map((item) => pagePath(item.href).length));
  const candidates = matching.filter((item) => pagePath(item.href).length === longest);
  const page = pagePath(candidates[0].href).split("/").pop();
  return (candidates.find((item) => item.id === page) ?? candidates[0]).id;
}

/** The page an entry opens, without the part of it the entry points to (?section=…). */
export const pagePath = (href: string) => href.split(/[?#]/)[0];

export function sectionForPath(pathname: string): NavigationSectionDef | undefined {
  // A sport's own pages belong to Training, wherever one's sport puts them.
  const matches = [...NAVIGATION_CATALOG.flatMap((section) => section.children.map((item) => ({ section, item }))), ...SPORT_ITEMS.map((item) => ({ section: NAVIGATION_CATALOG[0], item }))]
    .filter(({ item }) => pagePath(item.href) !== "/" && (pathname === pagePath(item.href) || pathname.startsWith(`${pagePath(item.href)}/`)))
    .sort((a, b) => pagePath(b.item.href).length - pagePath(a.item.href).length);
  // Several entries can share a page (Settings is under Training too, for Import):
  // the one named after the page wins, as in currentItemId.
  const page = pathname.split("/").filter(Boolean).pop();
  const longest = matches[0] ? pagePath(matches[0].item.href).length : undefined;
  const named = matches.find(({ item }) => pagePath(item.href).length === longest && item.id === page);
  return (named ?? matches[0])?.section ?? (pathname === "/" ? NAVIGATION_CATALOG[0] : undefined);
}

const KEY = "traintrack.navWheel";
const LEGACY_KEY = "traintrack.navItems";
const SECTION_IDS = NAVIGATION_CATALOG.map((section) => section.id);
const LEGACY_SECTION: Record<string, NavigationSectionId> = {
  log: "train", programs: "train", exercises: "train",
  progress: "performance", readiness: "performance", health: "performance", nutrition: "performance", challenges: "performance",
  teams: "coaching", activity: "coaching",
  profile: "profileAdmin", more: "profileAdmin",
};

const isSectionId = (value: unknown): value is NavigationSectionId =>
  typeof value === "string" && SECTION_IDS.includes(value as NavigationSectionId);

function uniqueSections(values: unknown): NavigationSectionId[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => isSectionId(value) ? value : LEGACY_SECTION[String(value)]).filter(Boolean))] as NavigationSectionId[];
}

function explicitSections(values: unknown): NavigationSectionId[] {
  return Array.isArray(values) ? [...new Set(values.filter(isSectionId))] : [];
}

export interface NavigationPreferences {
  version: 2;
  sectionOrder: NavigationSectionId[];
  hiddenSections: NavigationSectionId[];
}

export function migrateNavigationPreferences(value: unknown, legacyItems: unknown = null): NavigationPreferences {
  const saved = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const order = uniqueSections(saved.sectionOrder ?? saved.order);
  const legacy = uniqueSections(legacyItems);
  const sectionOrder = [...new Set([...(order.length ? order : legacy), ...SECTION_IDS])];
  // Legacy hidden values are destinations; hiding one must not hide its whole new universe.
  const hiddenSections = explicitSections(saved.hiddenSections ?? saved.hidden);
  return { version: 2, sectionOrder, hiddenSections };
}

export function getNavigationPreferences(): NavigationPreferences {
  if (typeof window === "undefined") return migrateNavigationPreferences(null);
  try {
    const raw = window.localStorage.getItem(KEY);
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    return migrateNavigationPreferences(raw ? JSON.parse(raw) : null, legacy ? JSON.parse(legacy) : null);
  } catch {
    return migrateNavigationPreferences(null);
  }
}

export function saveNavigationPreferences(preferences: NavigationPreferences): void {
  window.localStorage.setItem(KEY, JSON.stringify(migrateNavigationPreferences(preferences)));
  window.dispatchEvent(new Event("navitemschange"));
}

// Compatibility API for the existing Settings UI during the layout transition.
export const NAV_CATALOG = NAVIGATION_CATALOG.flatMap((section) => [...section.children]);
export const WHEEL_CATALOG = NAVIGATION_CATALOG;
export const LOCKED_NAV_ID = "profileAdmin";
export const HOME_NAV_ID = "train";
export function arrangeNav(order: string[], hidden: string[] = []): string[] {
  const ids = SECTION_IDS;
  const all = [...new Set([...order.filter((id) => ids.includes(id as NavigationSectionId)), ...ids])];
  const shown = all.filter((id) => id === LOCKED_NAV_ID || !hidden.includes(id));
  return shown.some((id) => id !== LOCKED_NAV_ID) ? shown : all;
}
export function getNavItemIds(): string[] {
  const preferences = getNavigationPreferences();
  return arrangeNav(preferences.sectionOrder, preferences.hiddenSections);
}
export function setNavItemIds(ids: string[]): void {
  const sections = uniqueSections(ids);
  saveNavigationPreferences({ version: 2, sectionOrder: [...sections, ...SECTION_IDS.filter((id) => !sections.includes(id))], hiddenSections: SECTION_IDS.filter((id) => !sections.includes(id)) });
}
export function resetNavItemIds(): string[] {
  saveNavigationPreferences(migrateNavigationPreferences(null));
  return getNavItemIds();
}

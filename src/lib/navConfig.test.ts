import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NAVIGATION_CATALOG, canAccessNavigation, currentItemId, getNavigationPreferences, migrateNavigationPreferences,
  navigationForAccess, pagePath, saveNavigationPreferences, sectionForPath,
} from "./navConfig";

describe("hierarchical navigation catalog", () => {
  it("has exactly two circular levels and no section exceeds six entries", () => {
    expect(NAVIGATION_CATALOG).toHaveLength(4);
    expect(NAVIGATION_CATALOG.every((section) => section.children.length <= 6)).toBe(true);
    expect(NAVIGATION_CATALOG.flatMap((section) => section.children).every((item) => !("children" in item))).toBe(true);
  });

  it("filters licensed destinations and whole licensed sections", () => {
    const basic = navigationForAccess({ role: "user", features: [] });
    expect(basic.map((section) => section.id)).not.toContain("coaching");
    expect(basic.find((section) => section.id === "performance")?.children.map((item) => item.id)).not.toContain("nutrition");
    const coach = navigationForAccess({ role: "user", features: ["coaching", "nutrition"] });
    expect(coach.map((section) => section.id)).toContain("coaching");
    expect(coach.find((section) => section.id === "performance")?.children.map((item) => item.id)).toContain("nutrition");
  });

  it("keeps administration role-only while admins bypass feature gates", () => {
    const adminItem = NAVIGATION_CATALOG[3].children.find((item) => item.id === "admin")!;
    expect(canAccessNavigation(adminItem, { role: "user", features: [] })).toBe(false);
    const admin = navigationForAccess({ role: "admin", isAdmin: true, features: [] });
    expect(admin.find((section) => section.id === "profileAdmin")?.children.map((item) => item.id)).toContain("admin");
    expect(admin.map((section) => section.id)).toContain("coaching");
  });
});

describe("the current item of a section", () => {
  const section = (id: string) => NAVIGATION_CATALOG.find((entry) => entry.id === id)!;

  it("is a single item even when several share the page's address", () => {
    for (const entry of NAVIGATION_CATALOG) {
      for (const item of entry.children) {
        const current = entry.children.filter((other) => other.id === currentItemId(entry, pagePath(item.href)));
        expect(current, `${entry.id} ${item.href}`).toHaveLength(1);
      }
    }
  });

  it("is the item named after the page, otherwise the first one sharing it", () => {
    expect(currentItemId(section("profileAdmin"), "/settings")).toBe("settings");
    expect(currentItemId(section("performance"), "/progress")).toBe("progress");
    expect(currentItemId(section("coaching"), "/coach")).toBe("athletes");
    expect(currentItemId(section("train"), "/programs/12")).toBe("programs");
  });

  it("never has two entries that open the same place", () => {
    // A section's own entry (its first child) repeats the section; the rest are each somewhere of their own.
    const places = NAVIGATION_CATALOG.flatMap((section) => section.children.map((item) => item.href));
    const repeated = places.filter((href, i) => places.indexOf(href) !== i);
    expect(repeated).toEqual([]);
  });

  it("knows the page of an entry pointing to one of its sections", () => {
    expect(currentItemId(section("profileAdmin"), "/settings")).toBe("settings");
    expect(currentItemId(section("train"), "/settings")).toBe("import");
  });

  it("puts a shared page in the section of the entry named after it", () => {
    expect(sectionForPath("/settings")?.id).toBe("profileAdmin");
    expect(sectionForPath("/programs/12")?.id).toBe("train");
    expect(sectionForPath("/coach")?.id).toBe("coaching");
    expect(sectionForPath("/")?.id).toBe("train");
  });

  it("matches the home page exactly, and nothing for a page outside the section", () => {
    expect(currentItemId(section("train"), "/")).toBe("today");
    expect(currentItemId(section("train"), "/progress")).toBeUndefined();
    expect(currentItemId(section("train"), "/programsx")).toBeUndefined();
  });
});

describe("navigation preference migration", () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => store[key] ?? null, setItem: (key: string, value: string) => { store[key] = value; } }, dispatchEvent: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("maps the old wheel destinations to stable section order without duplicates", () => {
    expect(migrateNavigationPreferences({ order: ["more", "log", "nutrition", "teams"], hidden: ["activity"] })).toEqual({
      version: 2,
      sectionOrder: ["profileAdmin", "train", "performance", "coaching"],
      hiddenSections: [],
    });
  });

  it("falls back to the legacy bottom bar and survives malformed storage", () => {
    store["traintrack.navItems"] = JSON.stringify(["home", "teams", "health", "more"]);
    expect(getNavigationPreferences().sectionOrder).toEqual(["coaching", "performance", "profileAdmin", "train"]);
    store["traintrack.navWheel"] = "{";
    expect(getNavigationPreferences().sectionOrder).toEqual(["train", "performance", "coaching", "profileAdmin"]);
  });

  it("writes only the versioned shape", () => {
    saveNavigationPreferences({ version: 2, sectionOrder: ["performance", "train", "coaching", "profileAdmin"], hiddenSections: ["coaching"] });
    expect(JSON.parse(store["traintrack.navWheel"])).toEqual({ version: 2, sectionOrder: ["performance", "train", "coaching", "profileAdmin"], hiddenSections: ["coaching"] });
  });
});

describe("the wheel for one's sport", () => {
  const all = { isAdmin: false, role: "user" as const, features: ["running", "vaulting", "excel_import"] };
  const train = (sports: Parameters<typeof navigationForAccess>[1]) => navigationForAccess(all, sports).find((s) => s.id === "train")!.children.map((c) => c.id);

  it("puts one's sport's own pages after today's session, in place of Sports", () => {
    expect(train(["running"])).toEqual(["today", "running", "programs", "exercises", "history", "import"]);
    expect(train(["callisthenics"])).toEqual(["today", "intervals", "programs", "exercises", "history", "import"]);
  });

  it("keeps six destinations at most, and both sports' pages", () => {
    expect(train(["vaulting", "running"])).toEqual(["today", "competitions", "horses", "running", "programs", "exercises"]);
  });

  it("changes nothing for a sport without pages of its own, or none", () => {
    const usual = ["today", "programs", "exercises", "sports", "history", "import"];
    expect(train([])).toEqual(usual);
    expect(train(["bodybuilding", null])).toEqual(usual);
  });

  it("keeps Sports when the licence opens none of the sport's pages", () => {
    expect(navigationForAccess({ role: "user", features: [] }, ["vaulting"]).find((s) => s.id === "train")!.children.map((c) => c.id)).toEqual(["today", "programs", "exercises", "sports", "history"]);
  });

  it("files a sport's pages under Training", () => {
    for (const path of ["/running", "/intervals", "/competitions", "/horses"]) expect(sectionForPath(path)?.id).toBe("train");
  });
});

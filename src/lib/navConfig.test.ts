import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WHEEL_CATALOG, arrangeNav, getNavItemIds, resetNavItemIds, setNavItemIds } from "./navConfig";

const ALL = WHEEL_CATALOG.map((n) => n.id);

describe("the sections on the menu wheel", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
      },
      dispatchEvent: () => true,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("put the given order first, then every other section, never Home", () => {
    expect(arrangeNav(["teams", "more"]).slice(0, 2)).toEqual(["teams", "more"]);
    expect(arrangeNav([])).toEqual(ALL);
    expect(arrangeNav(["home"])).not.toContain("home");
  });

  it("keep More and at least one other section", () => {
    expect(arrangeNav([], ALL)).toEqual(ALL);
    expect(arrangeNav(["log"], ALL.filter((id) => id !== "log"))).toEqual(["log", "more"]);
  });

  it("show as many sections as chosen, in order, and new ones on their own", () => {
    const chosen = ["teams", "log", "health", "challenges", "progress", "programs", "more"];
    setNavItemIds(chosen);
    expect(getNavItemIds()).toEqual(chosen);
    // A section the app gains later is in neither list, so it joins the wheel.
    const saved = JSON.parse(store["traintrack.navWheel"]);
    saved.hidden = saved.hidden.filter((id: string) => id !== "readiness");
    store["traintrack.navWheel"] = JSON.stringify(saved);
    expect(getNavItemIds()).toEqual([...chosen, "readiness"]);
  });

  it("keep the old bottom-bar choice first, with every other section after it", () => {
    store["traintrack.navItems"] = JSON.stringify(["home", "teams", "health", "more"]);
    const ids = getNavItemIds();
    expect(ids.slice(0, 3)).toEqual(["teams", "health", "more"]);
    expect([...ids].sort()).toEqual([...ALL].sort());
  });

  it("reset to the default order with every section", () => {
    setNavItemIds(["teams", "more"]);
    const ids = resetNavItemIds();
    expect(ids.slice(0, 4)).toEqual(["log", "nutrition", "progress", "more"]);
    expect(getNavItemIds()).toEqual(ids);
    expect(ids).toHaveLength(ALL.length);
  });
});

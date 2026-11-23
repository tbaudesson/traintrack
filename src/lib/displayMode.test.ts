import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_PARTS, hiddenCount, isNavPart, parseDisplayGuide, readDisplayMode, shows } from "./displayMode";
import { NAVIGATION_CATALOG, navigationForAccess } from "./navConfig";

// The reference as migration 082 seeds it.
const sql = readFileSync("supabase/migrations/082_display_modes.sql", "utf8");
const seeded = sql.slice(sql.indexOf("'\n{") + 1, sql.indexOf("}\n'") + 1);

describe("display modes", () => {
  it("read the seeded reference whole", () => {
    const guide = parseDisplayGuide(seeded);
    expect(guide).not.toBeNull();
    expect(Object.keys(guide!).length).toBeGreaterThan(20);
  });

  it("refuse a reference naming an unknown part or mode, so nothing is hidden by mistake", () => {
    expect(parseDisplayGuide('{"homePlanB": "pro"}')).toBeNull();
    expect(parseDisplayGuide('{"homeEverything": "expert"}')).toBeNull();
    expect(parseDisplayGuide("[]")).toBeNull();
    expect(parseDisplayGuide("not json")).toBeNull();
  });

  it("show a part from its first mode on", () => {
    const guide = parseDisplayGuide('{"homePlanB": "complete", "progressLoad": "expert"}');
    expect(shows("homePlanB", "essential", guide)).toBe(false);
    expect(shows("homePlanB", "complete", guide)).toBe(true);
    expect(shows("progressLoad", "complete", guide)).toBe(false);
    expect(shows("progressLoad", "expert", guide)).toBe(true);
    // Not listed: every mode.
    expect(shows("progressGoals", "essential", guide)).toBe(true);
  });

  it("show everything until the reference is known", () => {
    expect(ALL_PARTS.every((p) => shows(p, "essential", null))).toBe(true);
    expect(hiddenCount("essential", null)).toBe(0);
  });

  it("keep everything for a profile that never chose (the app as it was)", () => {
    expect(readDisplayMode(null)).toBe("expert");
    expect(readDisplayMode("bogus")).toBe("expert");
    expect(readDisplayMode("essential")).toBe("essential");
    expect(hiddenCount("expert", parseDisplayGuide(seeded))).toBe(0);
  });

  it("hide more in Essential than in Complete", () => {
    const guide = parseDisplayGuide(seeded);
    expect(hiddenCount("essential", guide)).toBeGreaterThan(hiddenCount("complete", guide));
    expect(hiddenCount("complete", guide)).toBeGreaterThan(0);
  });

  it("only name menu entries that exist, and never Settings", () => {
    const ids = NAVIGATION_CATALOG.flatMap((s) => s.children.map((c) => c.id));
    for (const part of ALL_PARTS.filter((p) => p.startsWith("nav."))) expect(ids).toContain(part.slice(4));
    expect(isNavPart("settings")).toBe(false);
    expect(isNavPart("today")).toBe(false);
  });

  it("leave Settings in the menu even in Essential", () => {
    const guide = parseDisplayGuide(seeded);
    const nav = navigationForAccess({ role: "user", features: [] }, [], (item) => !isNavPart(item.id) || shows(`nav.${item.id}`, "essential", guide));
    const ids = nav.flatMap((s) => s.children.map((c) => c.id));
    expect(ids).toContain("settings");
    expect(ids).toContain("today");
    expect(ids).not.toContain("assistant");
  });
});

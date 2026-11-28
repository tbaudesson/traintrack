import { describe, expect, it } from "vitest";
import { parseInjuryGuidance, persistentPains, returnHeld, type InjuryGuidance } from "./injuryGuidance";
import { returnPhases } from "./injuries";
import { injuryAreasOf, parsePainAreas } from "./references";
import { settingFromMigrations } from "./settingsFromMigrations";

// The areas an injury can be on, as migration 094 lists them.
const INJURY_AREAS = injuryAreasOf(parsePainAreas(settingFromMigrations("094_pain_areas.sql", "pain_areas")));
import type { PainReport } from "./pain";
import { injuryGuidanceFromMigrations, mobilityFromMigrations } from "./injuryGuidanceFromMigrations";

const MOBILITY_INJURY_RULES = injuryGuidanceFromMigrations().mobility;

const g = injuryGuidanceFromMigrations();
const MOVES = mobilityFromMigrations().moves.map((e) => e.key);
const pain = (date: string, area: PainReport["area"], level: number): PainReport => ({ date, area, level });

describe("the injury references", () => {
  it("are seeded whole by migration 058, with gentle moves for every area", () => {
    for (const area of INJURY_AREAS) expect(g.gentle[area]?.length, area).toBeGreaterThan(0);
  });

  it("never offer a gentle move to avoid for its own area", () => {
    for (const [area, keys] of Object.entries(g.gentle)) {
      for (const k of keys!) expect({ area, k, level: MOBILITY_INJURY_RULES[k]?.[area as PainReport["area"]] }).not.toMatchObject({ level: "avoid" });
    }
  });

  it("are refused when they do not hold together", () => {
    const broken = (change: (x: InjuryGuidance) => void) => {
      const copy = structuredClone(g);
      change(copy);
      return parseInjuryGuidance(JSON.stringify(copy), MOVES);
    };
    expect(broken((x) => { x.pain.moderate = 9; })).toBeNull();
    expect(broken((x) => { x.return.loads = [0.9, 0.7, 1]; })).toBeNull();
    expect(broken((x) => { x.return.loads = [0.7, 0.85]; })).toBeNull();
    expect(broken((x) => { x.gentle.knee = ["no-such-move"]; })).toBeNull();
  });
});

describe("following an injury", () => {
  const knee = [{ area: "knee" as const, since: "2026-10-01", healedOn: "2026-11-01" }];

  it("holds the return back a week when the area hurt lately", () => {
    expect(returnPhases(g, knee, "2026-11-10")[0]).toMatchObject({ week: 2, load: g.return.loads[1] });
    const held = returnPhases(g, knee, "2026-11-10", [pain("2026-11-08", "knee", g.return.holdAbovePain + 1)])[0];
    expect(held).toMatchObject({ week: 2, load: g.return.loads[0], held: true });
    // A mild pain, or one elsewhere, or long ago: the return goes on.
    expect(returnPhases(g, knee, "2026-11-10", [pain("2026-11-08", "knee", g.return.holdAbovePain)])[0].held).toBeUndefined();
    expect(returnPhases(g, knee, "2026-11-10", [pain("2026-11-08", "shoulder", 8)])[0].held).toBeUndefined();
    expect(returnHeld(g, [pain("2026-10-20", "knee", 8)], "knee", "2026-11-10")).toBe(false);
  });

  it("calls for a professional when a pain keeps coming back", () => {
    const n = g.persistent.reports;
    const reports = Array.from({ length: n }, (_, i) => pain(`2026-11-${String(10 + i).padStart(2, "0")}`, "knee", g.persistent.minLevel));
    expect(persistentPains(g, reports, "2026-11-20")).toEqual([{ area: "knee", reports: n, worst: g.persistent.minLevel }]);
    expect(persistentPains(g, reports.slice(1), "2026-11-20")).toEqual([]);
    expect(persistentPains(g, reports.map((r) => ({ ...r, level: g.persistent.minLevel - 1 })), "2026-11-20")).toEqual([]);
  });
});

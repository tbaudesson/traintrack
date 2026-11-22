import { describe, expect, it } from "vitest";
import { FAVORITE_DEFS, SPORT_DEFS, metricPlace, metricsOf } from "./disciplines";
import { FAVORITE_SPORTS } from "./appTheme";
import { CATEGORY_ORDER } from "./programCategories";
import { DISCIPLINES, disciplineOf } from "./loadHistory";
import { SPORTS, hasDistance } from "./cardio";
import { cardioSportOf, kindOf } from "./activityProfile";
import { cadenceUnit } from "./sportMetrics";
import { GOAL_OF_SPORT } from "./onboarding";

describe("the discipline registry", () => {
  it("describes every endurance sport and every favourite sport", () => {
    expect([...SPORTS].sort()).toEqual(Object.keys(SPORT_DEFS).sort());
    expect([...FAVORITE_SPORTS].sort()).toEqual(Object.keys(FAVORITE_DEFS).sort());
  });

  it("only points to shelves, chart lines and favourites that exist", () => {
    for (const def of Object.values(SPORT_DEFS)) {
      if (def.category) expect(CATEGORY_ORDER).toContain(def.category);
      expect(DISCIPLINES).toContain(def.discipline);
      if (def.favorite) expect(FAVORITE_SPORTS).toContain(def.favorite);
    }
    for (const def of Object.values(FAVORITE_DEFS)) {
      expect(CATEGORY_ORDER).toContain(def.category);
      if (def.sport) expect(Object.keys(SPORT_DEFS)).toContain(def.sport);
    }
  });

  it("asks each metric once, always the time, and only what the sport has", () => {
    for (const [sport, def] of Object.entries(SPORT_DEFS)) {
      const all = [...def.essential, ...def.advanced];
      expect(new Set(all).size, sport).toBe(all.length);
      expect(def.essential, sport).toContain("duration");
      if (!def.distanceUnit) expect(all, sport).not.toContain("distance");
      else expect(def.essential, sport).toContain("distance");
      if (!def.cadence) expect(all, sport).not.toContain("cadence");
      const swimOnly = ["swimStroke", "pool", "strokesPerLength"] as const;
      if (sport !== "swim") for (const m of swimOnly) expect(all, sport).not.toContain(m);
    }
  });

  it("is what the rest of the app reads", () => {
    expect(hasDistance("vaulting")).toBe(false);
    expect(hasDistance("swim")).toBe(true);
    expect(cadenceUnit("bike")).toBe("rpm");
    expect(cadenceUnit("swim")).toBeNull();
    expect(disciplineOf({ kind: "cardio", sport: "row" })).toBe("other");
    expect(disciplineOf({ kind: "cardio", sport: "swim" })).toBe("swim");
    expect(kindOf("cycling")).toBe("endurance");
    expect(cardioSportOf("vaulting")).toBeNull();
    expect(cardioSportOf("swimming")).toBe("swim");
    expect(GOAL_OF_SPORT.bodybuilding).toBe("hypertrophy");
  });

  it("places a metric first, later or nowhere", () => {
    expect(metricPlace("bike", "avgPower")).toBe("essential");
    expect(metricPlace("bike", "maxPower")).toBe("advanced");
    expect(metricPlace("run", "avgPower")).toBeNull();
    expect(metricsOf("vaulting")).toEqual(["duration"]);
  });
});

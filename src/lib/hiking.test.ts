import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { programCategory } from "./programCategories";
import { formatPace } from "./cardio";
import { cardioSportOf, kindOf } from "./activityProfile";
import { familyForTests } from "./templatesForTests";

const HIKING_TEMPLATES = familyForTests("HIKING_TEMPLATES");

describe("hiking", () => {
  it("is an endurance sport of its own, read in km/h", () => {
    expect(kindOf("hiking")).toBe("endurance");
    expect(cardioSportOf("hiking")).toBe("hike");
    expect(formatPace("hike", 12000, 4 * 3600)).toBe("3.0 km/h");
  });

  it("has two programs in each language, on the hiking shelf, and in migration 062", () => {
    const sql = readFileSync("supabase/migrations/062_hiking.sql", "utf8");
    for (const locale of ["fr", "en", "de"]) expect(HIKING_TEMPLATES.filter((t) => t.locale === locale)).toHaveLength(2);
    for (const t of HIKING_TEMPLATES) {
      expect(programCategory(t), t.id).toBe("hiking");
      expect(sql.includes(`'${t.name.replace(/'/g, "''")}'`), t.id).toBe(true);
    }
  });

  it("alternate strength and outings on foot, every week, the long one growing", () => {
    for (const t of HIKING_TEMPLATES) {
      expect(t.structure).toHaveLength(24);
      for (const d of t.structure) {
        if (d.cardio) {
          expect(d.cardio.sport, `${t.id} ${d.name}`).toBe("hike");
          expect(d.cardio.durationMin, `${t.id} ${d.name}`).toBeGreaterThan(30);
          expect(d.cardio.steps!.every((s) => s && !s.includes("undefined")), `${t.id} ${d.name}`).toBe(true);
        } else expect(d.exercises.length, `${t.id} ${d.name}`).toBeGreaterThan(4);
      }
      const longs = t.structure.filter((_, i) => i % 3 === 2).map((d) => d.cardio!.durationMin!);
      expect(longs[6], t.id).toBeGreaterThan(longs[0]);
    }
  });

  it("send the hiker off with a checklist: route left with someone, weather, water, first aid", () => {
    const fr = HIKING_TEMPLATES.find((t) => t.id === "rando-trek")!;
    expect(fr.structure.filter((d) => d.cardio?.notes?.includes("itinéraire laissé à un proche")).length).toBeGreaterThanOrEqual(8);
  });
});

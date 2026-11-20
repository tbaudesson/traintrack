import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSwimTechniques } from "./swimTechniques";
import { SWIM_TEMPLATES } from "./swimTemplates";
import { programCategory } from "./programCategories";
import { isPlayable } from "./demoVideos";

// The sheets as migration 060 seeds them: the tests read the very data the app does.
const sql = readFileSync("supabase/migrations/060_swimming.sql", "utf8");
const seed = sql.slice(sql.indexOf("'", sql.indexOf("'swim_techniques',") + 18) + 1, sql.indexOf("')\nON CONFLICT")).replace(/''/g, "'");
const sheets = parseSwimTechniques(seed)!;

describe("the swim technique sheets", () => {
  it("are seeded whole: the four strokes and the drills, in three languages, each with a video", () => {
    expect(sheets).not.toBeNull();
    expect(sheets.filter((s) => s.kind === "stroke").map((s) => s.key).sort()).toEqual(["backstroke", "breaststroke", "butterfly", "crawl"]);
    for (const s of sheets) expect(isPlayable(s.video), s.key).toBe(true);
  });

  it("cover every technique the programs' sessions link to", () => {
    const used = new Set(SWIM_TEMPLATES.flatMap((t) => t.structure.flatMap((d) => d.cardio?.techniques ?? [])));
    expect([...used].filter((k) => !sheets.some((s) => s.key === k))).toEqual([]);
  });

  it("are refused when a language, a key or a video link is wrong", () => {
    const broken = (change: (x: typeof sheets) => void) => {
      const copy = structuredClone(sheets);
      change(copy);
      return parseSwimTechniques(JSON.stringify(copy));
    };
    expect(broken((x) => { x[0].name.de = ""; })).toBeNull();
    expect(broken((x) => { x[1].key = x[0].key; })).toBeNull();
    expect(broken((x) => { x[0].video = "http://example.com"; })).toBeNull();
    expect(broken((x) => { x[0].points.fr = [""]; })).toBeNull();
  });
});

describe("the swimming programs", () => {
  it("are four in each language, on the swimming shelf, and in the migration", () => {
    for (const locale of ["fr", "en", "de"]) expect(SWIM_TEMPLATES.filter((t) => t.locale === locale)).toHaveLength(4);
    for (const t of SWIM_TEMPLATES) {
      expect(programCategory(t), t.id).toBe("swimming");
      expect(sql.includes(`'${t.name.replace(/'/g, "''")}'`), t.id).toBe(true);
    }
  });

  it("are swims all through, each session with its steps, its distance and its techniques", () => {
    for (const t of SWIM_TEMPLATES) {
      expect(t.structure.length % t.daysPerWeek, t.id).toBe(0);
      for (const d of t.structure) {
        expect(d.cardio?.sport, `${t.id} ${d.name}`).toBe("swim");
        expect(d.cardio!.distanceKm!, `${t.id} ${d.name}`).toBeGreaterThan(0.3);
        expect(d.cardio!.steps!.every((s) => s && !s.includes("undefined")), `${t.id} ${d.name}`).toBe(true);
        expect(d.cardio!.techniques!.length, `${t.id} ${d.name}`).toBeGreaterThan(0);
      }
    }
  });

  it("build up: learning ends on 200 m in one go, the distance plan reaches 2 km", () => {
    const fr = (id: string) => SWIM_TEMPLATES.find((t) => t.id === id)!;
    expect(fr("natation-apprendre-crawl").structure.at(-1)!.cardio!.steps!.some((s) => s.startsWith("200 m sans s'arrêter"))).toBe(true);
    expect(fr("natation-1500-2k").structure.some((d) => d.cardio!.steps!.some((s) => s.startsWith("2000 m sans s'arrêter")))).toBe(true);
    // Open water: the safety note on the long swims of the second half.
    expect(fr("natation-triathlon").structure.filter((d) => d.cardio!.notes?.includes("ne nagez jamais seul")).length).toBeGreaterThan(0);
  });
});

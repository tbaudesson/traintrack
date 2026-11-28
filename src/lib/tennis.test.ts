import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { addDays, drillText, groupWeeks, isoDay, lessonLength, nextSlot, planItem, planMinutes, previousPlan, slotsOfWeek, suitsAge, themeMinutes, themesToRevisit } from "./tennis";
import type { TennisPlanItem } from "@/db";
import { coreThemes, parseTennisReference, refLabel } from "./tennisReference";

// The reference as migration 089 puts it in the app settings.
const sql089 = readFileSync("supabase/migrations/089_tennis_teams_and_references.sql", "utf8");
const reference = parseTennisReference(sql089.match(/VALUES \('tennis_reference', '([\s\S]*?)'\) ON CONFLICT/)![1].replace(/''/g, "'"))!;
const CORE = coreThemes(reference);

const group = { slots: [{ day: 4, time: "17:00", minutes: 90 }, { day: 2, time: "17:00", minutes: 60 }] };
const item = (category: TennisPlanItem["category"], minutes: number): TennisPlanItem => ({ name: category, category, minutes });

describe("the week of a group", () => {
  it("places its slots in a week, earliest first, and finds the next one", () => {
    expect(isoDay("2026-11-30")).toBe(1);
    expect(slotsOfWeek(group, "2026-11-30").map((s) => s.date)).toEqual(["2026-12-01", "2026-12-03"]);
    expect(nextSlot(group, "2026-12-02")?.date).toBe("2026-12-03");
    expect(nextSlot(group, "2026-12-01")?.date).toBe("2026-12-01");
    expect(nextSlot({ slots: [] }, "2026-12-01")).toBeNull();
    expect(lessonLength(group, "2026-12-03")).toBe(90);
    expect(lessonLength(group, "2026-12-05")).toBe(60);
  });
});

describe("the themes worked", () => {
  const lessons = [
    { id: 1, date: "2026-11-17", givenAt: "x", plan: [item("serve", 20), item("forehand", 15)] },
    { id: 2, date: "2026-11-24", givenAt: "x", plan: [item("forehand", 10), item("footwork", 10), item("backhand", 10)] },
    { id: 3, date: "2026-12-01", givenAt: null, plan: [item("volley", 30)] },
  ];

  it("counts the minutes of the lessons given only", () => {
    const m = themeMinutes(lessons);
    expect(m.get("forehand")).toBe(25);
    expect(m.get("volley")).toBeUndefined();
    expect(planMinutes(lessons[1].plan)).toBe(30);
  });

  it("names the core themes left aside these last three weeks, for a group that trained", () => {
    expect(themesToRevisit(lessons, "2026-12-01", CORE)).toEqual(["return", "volley"]);
    expect(themesToRevisit(lessons, "2026-12-28", CORE)).toEqual([]);
  });

  it("starts from the last lesson's plan, a copy", () => {
    const plan = previousPlan(lessons, "2026-11-30");
    expect(plan?.map((p) => p.category)).toEqual(["forehand", "footwork", "backhand"]);
    plan![0].minutes = 99;
    expect(lessons[1].plan[0].minutes).toBe(10);
    expect(previousPlan(lessons, "2026-11-10")).toBeNull();
  });

  it("lays the lessons out week by week, with the weeks ahead that have one", () => {
    const weeks = groupWeeks([...lessons, { id: 4, date: "2026-12-15", givenAt: null, plan: [] }], "2026-12-01", 3);
    expect(weeks.map((w) => w.monday)).toEqual(["2026-11-16", "2026-11-23", "2026-11-30", "2026-12-14"]);
    expect(weeks[2].lessons.map((l) => l.id)).toEqual([3]);
  });
});

describe("a drill", () => {
  const drill = { uuid: "u", name: "Mini-tennis", nameFr: "Mini-tennis FR", nameDe: null, description: "en", descriptionFr: "fr", descriptionDe: null, category: "warmup" as const, minutes: 10, ages: ["8-10" as const] };
  it("reads in the app's language, English otherwise, and becomes a line of a lesson", () => {
    expect(drillText(drill, "fr")).toEqual({ name: "Mini-tennis FR", description: "fr" });
    expect(drillText(drill, "de")).toEqual({ name: "Mini-tennis", description: "en" });
    expect(planItem(drill, "fr")).toEqual({ drill: "u", name: "Mini-tennis FR", category: "warmup", minutes: 10 });
    expect(suitsAge(drill, "8-10") && !suitsAge(drill, "14-16") && suitsAge({ ages: [] }, "adult") && suitsAge(drill, null)).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("the reference of migration 089 and the library of migration 088", () => {
  const sql = readFileSync("supabase/migrations/088_tennis.sql", "utf8");
  const rows = [...sql.matchAll(/^INSERT INTO tennis_drills .*? VALUES \(NULL, '((?:[^']|'')+)', .*?, '([\w-]+)', (\d+), '(\[.*?\])'::jsonb, '(\[.*?\])'::jsonb\)/gm)];
  const ids = (list: { id: string }[]) => list.map((i) => i.id);

  it("names themes, ages, levels and equipment in three languages, the strokes and footwork marked core", () => {
    expect(reference).not.toBeNull();
    expect(CORE).toEqual(["footwork", "forehand", "backhand", "serve", "return", "volley"]);
    expect(refLabel(reference.ageBands, "8-10", "fr")).toBe("8-10 ans");
    expect(refLabel(reference.themes, "gone", "fr")).toBe("gone");
    expect(parseTennisReference(JSON.stringify({ ...reference, themes: [{ id: "Bad Id", fr: "a", en: "b", de: "c" }] }))).toBeNull();
  });

  it("covers every drill of the library: its theme, its ages, its equipment", () => {
    expect(rows.length).toBe(35);
    expect(new Set(rows.map((r) => r[2]))).toEqual(new Set(ids(reference.themes)));
    for (const r of rows) {
      for (const a of JSON.parse(r[4])) expect(ids(reference.ageBands)).toContain(a);
      for (const e of JSON.parse(r[5])) expect(ids(reference.equipment)).toContain(e);
    }
    expect(new Set(rows.map((r) => r[1])).size).toBe(35);
  });
});

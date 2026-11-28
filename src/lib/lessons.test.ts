import { describe, expect, it } from "vitest";
import { addDays, drillText, groupWeeks, isoDay, lessonLength, nextSlot, planItem, planMinutes, previousPlan, slotsOfWeek, suitsAge, themeMinutes, themesToRevisit } from "./lessons";
import type { LessonPlanItem } from "@/db";
import { coreThemes, parseLessonsReference, refLabel, sportOf } from "./lessonsReference";
import { lessonExercisesFromMigrations, lessonsReferenceFromMigrations } from "./lessonsFromMigrations";

// The reference as migration 092 puts it in the app settings.
const reference = lessonsReferenceFromMigrations();
const tennis = sportOf(reference, "tennis")!;
const CORE = coreThemes(tennis);

const group = { slots: [{ day: 4, time: "17:00", minutes: 90 }, { day: 2, time: "17:00", minutes: 60 }] };
const item = (category: string, minutes: number): LessonPlanItem => ({ name: category, category, minutes });

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

describe("an exercise of the library in a lesson", () => {
  const ex = { uuid: "u", name: "Mini-tennis", nameFr: "Mini-tennis FR", nameDe: null, description: "en", descriptionFr: "fr", descriptionDe: null, theme: "warmup", minutes: 10, ages: ["8-10"] };
  it("reads in the app's language, English otherwise, and becomes a line of a lesson", () => {
    expect(drillText(ex, "fr")).toEqual({ name: "Mini-tennis FR", description: "fr" });
    expect(drillText(ex, "de")).toEqual({ name: "Mini-tennis", description: "en" });
    expect(planItem(ex, "fr")).toEqual({ drill: "u", name: "Mini-tennis FR", category: "warmup", minutes: 10 });
    expect(suitsAge(ex, "8-10") && !suitsAge(ex, "14-16") && suitsAge({ ages: [] }, "adult") && suitsAge(ex, null)).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("not made for lessons, it comes with a few minutes and no theme", () => {
    expect(planItem({ uuid: "s", name: "Back Squat", theme: null, minutes: null }, "fr")).toEqual({ drill: "s", name: "Back Squat", category: null, minutes: 5 });
  });
});

describe("the sports of migration 092 and their exercises", () => {
  const rows = lessonExercisesFromMigrations();
  const ids = (list: { id: string }[]) => list.map((i) => i.id);

  it("are tennis and vaulting, named in three languages, vaulting on a horse, with their core themes", () => {
    expect(ids(reference.sports)).toEqual(["tennis", "vaulting"]);
    expect(refLabel(reference.sports, "vaulting", "fr")).toBe("Voltige");
    expect(sportOf(reference, "vaulting")!.horses).toBe(true);
    expect(tennis.horses).toBe(false);
    expect(CORE).toEqual(["footwork", "forehand", "backhand", "serve", "return", "volley"]);
    expect(refLabel(tennis.ageBands, "8-10", "fr")).toBe("8-10 ans");
    expect(refLabel(tennis.themes, "gone", "fr")).toBe("gone");
    expect(parseLessonsReference(JSON.stringify({ sports: [{ ...tennis, themes: [{ id: "Bad Id", fr: "a", en: "b", de: "c" }] }] }))).toBeNull();
    expect(parseLessonsReference(JSON.stringify({ sports: [tennis, tennis] }))).toBeNull();
  });

  it("cover every exercise: its theme, its ages, its kit, a name of its own", () => {
    expect(rows.filter((r) => r.sport === "tennis").length).toBe(35);
    expect(rows.filter((r) => r.sport === "vaulting").length).toBe(25);
    for (const sport of reference.sports) {
      const own = rows.filter((r) => r.sport === sport.id);
      expect(new Set(own.map((r) => r.theme)), sport.id).toEqual(new Set(ids(sport.themes)));
      for (const r of own) {
        for (const a of r.ages) expect(ids(sport.ageBands), r.name).toContain(a);
        for (const g of r.gear) expect(ids(sport.equipment), r.name).toContain(g);
      }
    }
    expect(new Set(rows.map((r) => r.name)).size).toBe(rows.length);
  });
});

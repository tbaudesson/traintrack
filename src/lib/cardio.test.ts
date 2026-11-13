import { describe, it, expect } from "vitest";
import type { Workout } from "@/db";
import { cardioBests, describeTarget, formatDistance, formatDuration, formatPace, isCardioDone, newCardioRecords } from "./cardio";
import { ENDURANCE_TEMPLATES } from "./enduranceTemplates";
import { speaks } from "./templateService";

const run = (id: number, distanceM?: number, durationSec?: number) =>
  ({ id, kind: "cardio", sport: "run", distanceM, durationSec }) as Workout;

describe("formatting", () => {
  it("gives each sport its own pace", () => {
    expect(formatPace("run", 10000, 3000)).toBe("5:00 /km");
    expect(formatPace("swim", 1000, 1200)).toBe("2:00 /100 m");
    expect(formatPace("bike", 30000, 3600)).toBe("30.0 km/h");
    expect(formatPace("row", 2000, 480)).toBe("2:00 /500 m");
  });

  it("has no pace without both numbers", () => {
    expect(formatPace("run", 10000, undefined)).toBeNull();
  });

  it("formats distances and durations", () => {
    expect(formatDistance(10000, "run")).toBe("10 km");
    expect(formatDistance(1500, "swim")).toBe("1500 m");
    expect(formatDuration(3900)).toBe("1 h 05");
    expect(formatDuration(2700)).toBe("45 min");
  });

  it("describes a target", () => {
    expect(describeTarget({ sport: "run", distanceKm: 10, intensity: "Zone 2" })).toBe("10 km · Zone 2");
  });
});

describe("done and records", () => {
  it("needs a distance or a duration to count as done", () => {
    expect(isCardioDone(run(1))).toBe(false);
    expect(isCardioDone(run(1, 5000))).toBe(true);
  });

  it("ignores very short efforts for the best pace", () => {
    expect(cardioBests([run(1, 400, 60), run(2, 5000, 1500)], "run").bestSpeed).toBeCloseTo(5000 / 1500);
  });

  it("detects longer and faster", () => {
    expect(newCardioRecords(run(2, 12000, 3000), [run(1, 10000, 3000)])).toEqual(["distance", "pace"]);
  });

  it("does not celebrate a first outing or a slower one", () => {
    expect(newCardioRecords(run(1, 10000, 3000), [])).toEqual([]);
    expect(newCardioRecords(run(2, 5000, 3000), [run(1, 10000, 3000)])).toEqual([]);
  });
});

describe("endurance plans", () => {
  const marathon = ENDURANCE_TEMPLATES.find((t) => t.id === "plan-marathon-16")!;

  it("build a marathon over 16 weeks and end on the race", () => {
    expect(new Set(marathon.structure.map((d) => d.week)).size).toBe(16);
    expect(marathon.structure.at(-1)?.cardio?.distanceKm).toBe(42.2);
  });

  it("taper before the race", () => {
    const longest = (week: number) =>
      Math.max(...marathon.structure.filter((d) => d.week === week).map((d) => d.cardio?.distanceKm ?? 0));
    expect(longest(13)).toBeGreaterThan(longest(14));
    expect(longest(14)).toBeGreaterThan(longest(15));
  });

  it("lay out every session step by step, with its purpose", () => {
    const bare = ENDURANCE_TEMPLATES.flatMap((t) => t.structure)
      .filter((d) => d.cardio && (!d.cardio.purpose || (d.cardio.steps ?? []).length < 2));
    expect(bare.map((d) => d.name)).toEqual([]);
  });

  it("taper only after the longest long run", () => {
    const tenK = ENDURANCE_TEMPLATES.find((t) => t.id === "plan-10k-8")!;
    const week6 = tenK.structure.filter((d) => d.week === 6).map((d) => d.name);
    expect(week6).not.toContain("S6 · Rappel d'allure");
  });

  it("change the swimming sessions from week to week", () => {
    const swim = ENDURANCE_TEMPLATES.find((t) => t.id === "plan-natation-8")!;
    const series = swim.structure.filter((d) => d.name.endsWith("Séries")).map((d) => d.cardio?.steps?.join());
    expect(new Set(series).size).toBe(series.length);
  });

  it("add up the swim distance from its laps", () => {
    const swim = ENDURANCE_TEMPLATES.find((t) => t.id === "plan-natation-8")!;
    expect(swim.structure[0].cardio?.distanceKm).toBe(1.5);
  });

  it("offer the same plans in every language", () => {
    const shape = (locale: string) =>
      ENDURANCE_TEMPLATES.filter((t) => t.locale === locale).map((t) =>
        t.structure.map((d) => [d.week, d.cardio?.distanceKm, d.cardio?.durationMin, d.cardio?.steps?.length, d.exercises.length])
      );
    expect(shape("en")).toEqual(shape("fr"));
    expect(shape("de")).toEqual(shape("fr"));
  });

  it("show each user the plans of their language only", () => {
    const names = (locale: string) => ENDURANCE_TEMPLATES.filter(speaks(locale)).map((t) => t.name);
    expect(names("en")).toContain("Marathon in 16 weeks");
    expect(names("en")).not.toContain("Marathon en 16 semaines");
    expect(names("de")).toContain("Marathon in 16 Wochen");
    expect(speaks("de")({})).toBe(true);
  });

  it("give every session a distance or a duration", () => {
    const empty = ENDURANCE_TEMPLATES.flatMap((t) => t.structure)
      .filter((d) => d.cardio && !d.cardio.distanceKm && !d.cardio.durationMin);
    expect(empty).toEqual([]);
  });
});

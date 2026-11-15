import { describe, expect, it } from "vitest";
import { insightPeriod, insights } from "./insights";
import type { TrainingLoad } from "./trainingLoad";

const today = "2026-11-15";
const day = (ago: number) => {
  const d = new Date(Date.UTC(2026, 10, 15 - ago));
  return d.toISOString().slice(0, 10);
};

let nextId = 1;
type Built = { workouts: { id: number; date: string; title: string; kind?: "strength" | "cardio" | "interval"; distanceM?: number }[]; sets: { workoutId: number; exerciseId: number; setNumber: number; completed: boolean; isWarmup: boolean; weightKg?: number; reps?: number }[] };
const empty = (): Built => ({ workouts: [], sets: [] });

/** A strength session: one exercise, its sets as [kg, reps]. */
function lift(b: Built, ago: number, exerciseId: number, sets: [number, number][]) {
  const id = nextId++;
  b.workouts.push({ id, date: day(ago), title: "Séance" });
  sets.forEach(([kg, reps], i) => b.sets.push({ workoutId: id, exerciseId, setNumber: i + 1, completed: true, isWarmup: false, weightKg: kg || undefined, reps }));
}
function run(b: Built, ago: number, km: number) {
  b.workouts.push({ id: nextId++, date: day(ago), title: "Footing", kind: "cardio", distanceM: km * 1000 });
}

const danger: TrainingLoad = { acute: 900, chronic: 400, ratio: 2.25, zone: "danger", weeks: [300, 350, 400, 900] };

describe("the period read", () => {
  it("is the last four weeks, today included, against the four before, with their dates", () => {
    expect(insightPeriod(today)).toEqual({ from: "2026-10-19", to: "2026-11-15", previousFrom: "2026-09-21", previousTo: "2026-10-18" });
  });
});

describe("insights", () => {
  it("says there is not enough data yet rather than conclude", () => {
    const b = empty();
    lift(b, 2, 1, [[50, 10]]);
    lift(b, 9, 1, [[50, 10]]);
    const { insights: list } = insights({ today, ...b });
    expect(list.map((i) => i.kind)).toEqual(["insufficient"]);
    expect(list[0].values).toEqual({ done: 2, needed: 3 });
  });

  it("puts safety first, even with little data", () => {
    const b = empty();
    lift(b, 1, 1, [[50, 10]]);
    const { insights: list } = insights({ today, ...b, load: danger });
    expect(list.map((i) => i.kind)).toEqual(["load", "insufficient"]);
    expect(list[0].tone).toBe("warn");
    expect(list[0].action.key).toBe("actionLighten");
  });

  it("reads a loaded strength block: records first, then the volume, both against the four weeks before", () => {
    const b = empty();
    for (const ago of [30, 37, 44]) lift(b, ago, 1, [[100, 10], [100, 10]]);
    for (const ago of [3, 10, 17, 24]) lift(b, ago, 1, [[110, 10], [110, 10]]);
    const { insights: list } = insights({ today, ...b });
    expect(list.map((i) => i.kind)).toEqual(["records", "volumeUp"]);
    expect(list[0].evidence[0]).toMatchObject({ key: "record", values: { weight: 110, reps: 10 }, chart: "records", exerciseId: 1 });
    // 4 × 2200 kg against 3 × 2000 kg.
    expect(list[1].values.change).toBe(47);
    expect(list[1].evidence[0].values).toEqual({ now: 8800, before: 6000 });
  });

  it("never speaks of kilos for runs and bodyweight work", () => {
    const b = empty();
    for (const ago of [29, 33, 40]) run(b, ago, 5);
    for (const ago of [2, 6, 12, 20]) run(b, ago, 5);
    lift(b, 4, 2, [[0, 20], [0, 15]]); // push-ups, no load
    const { insights: list } = insights({ today, ...b });
    expect(list.map((i) => i.kind)).toEqual(["distanceUp"]);
    expect(list[0].evidence[0].values).toEqual({ now: 20, before: 15 });
    expect(JSON.stringify(list)).not.toMatch(/volume|kg/);
  });

  it("calls an exercise stalled only with enough comparable efforts over five weeks", () => {
    const b = empty();
    lift(b, 50, 3, [[100, 5]]); // the best before
    for (const ago of [2, 9, 16, 23]) lift(b, ago, 3, [[95, 5]]);
    const stalled = insights({ today, ...b }).insights.find((i) => i.kind === "stagnation");
    expect(stalled?.evidence[0]).toMatchObject({ key: "stall", chart: "exercise", exerciseId: 3, values: { before: 117, date: day(50) } });
    // Another rep range, not a deload, without a sign of fatigue.
    expect(stalled?.action.key).toBe("actionRepRange");

    // Three efforts only: nothing said.
    const few = empty();
    lift(few, 50, 3, [[100, 5]]);
    for (const ago of [2, 9, 16]) lift(few, ago, 3, [[95, 5]]);
    expect(insights({ today, ...few }).insights.some((i) => i.kind === "stagnation")).toBe(false);
  });

  it("advises a deload on a stall only when a sign of fatigue or overload exists", () => {
    const b = empty();
    lift(b, 50, 3, [[100, 5]]);
    for (const ago of [2, 9, 16, 23]) lift(b, ago, 3, [[95, 5]]);
    const withDeload = insights({ today, ...b, deload: { reason: "weeks", weeks: 6 } }).insights.find((i) => i.kind === "stagnation");
    expect(withDeload?.action).toEqual({ key: "actionDeload", href: "/" });
  });

  it("notes fewer sessions than planned", () => {
    const b = empty();
    for (const ago of [1, 8, 15, 22]) lift(b, ago, 2, [[0, 10]]);
    const regular = insights({ today, ...b, perWeek: 4 }).insights.find((i) => i.kind === "regularity");
    expect(regular?.values).toEqual({ count: 1, target: 4 });
    expect(insights({ today, ...b, perWeek: 1 }).insights.some((i) => i.kind === "regularity")).toBe(false);
  });

  it("says the work was kept up when nothing else stands out", () => {
    const b = empty();
    for (const ago of [1, 8, 15]) lift(b, ago, 2, [[0, 10]]);
    const { insights: list } = insights({ today, ...b });
    expect(list).toEqual([{ kind: "steady", tone: "good", values: { sessions: 3 }, evidence: [{ key: "sessions", values: { now: 3, before: 0 } }], action: { key: "actionKeepGoing", href: "/log" } }]);
  });

  it("flags the same pain reported again", () => {
    const b = empty();
    for (const ago of [1, 8, 15]) lift(b, ago, 2, [[0, 10]]);
    const pains = [
      { date: day(3), area: "shoulder" as const, level: 4, exerciseName: "Push-up" },
      { date: day(10), area: "shoulder" as const, level: 5 },
      { date: day(12), area: "knee" as const, level: 3 },
    ];
    const { insights: list } = insights({ today, ...b, pains });
    expect(list[0]).toMatchObject({ kind: "pain", tone: "warn", values: { area: "shoulder", count: 2 } });
    expect(list[0].evidence).toEqual([{ key: "pain", values: { count: 2, date: day(3) } }, { key: "painExercise", values: { exercise: "Push-up" } }]);
  });
});

describe("the words of the insights", () => {
  it("exist in French, English and German for every insight, piece of evidence and action", async () => {
    const source = await import("node:fs").then((fs) => fs.readFileSync("src/lib/insights.ts", "utf8"));
    const kinds = [...source.matchAll(/kind: (?:diff >= 10 \? )?"(\w+)"(?: : "(\w+)")?/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean);
    const evidence = [...source.matchAll(/key: "(\w+)", values/g)].map((m) => m[1]);
    const actions = [...source.matchAll(/key: "(action\w+)"/g)].map((m) => m[1]);
    expect(kinds.length).toBeGreaterThan(8);
    for (const locale of ["fr", "en", "de"]) {
      const words = (await import(`../messages/${locale}.json`)).default.insights as Record<string, string>;
      for (const k of kinds) {
        expect(words[`title_${k}`], `${locale} title_${k}`).toBeTruthy();
        expect(words[`text_${k}`], `${locale} text_${k}`).toBeTruthy();
      }
      for (const k of evidence) expect(words[`ev_${k}`], `${locale} ev_${k}`).toBeTruthy();
      for (const k of actions) expect(words[k], `${locale} ${k}`).toBeTruthy();
    }
  });
});

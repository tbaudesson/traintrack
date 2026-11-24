import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boxingFormat, boxingPool, buildBoxingSession, parseBoxing, roundCount, type BoxingGuidance } from "./boxing";
import { libraryFromMigrations } from "./libraryFromMigrations";
import { demoVideo } from "./demoVideos";
import { patternSeconds, roundsDone, type BoxingPlan } from "./intervals";

// The reference as migration 085 seeds it.
const sql = readFileSync("supabase/migrations/085_boxing.sql", "utf8");
const G = parseBoxing(sql.slice(sql.indexOf("'boxing_rounds', '") + 18, sql.indexOf("')\nON CONFLICT")))!;
const LIBRARY = new Map(libraryFromMigrations().map((r) => [r.name, r]));
const plan = (over: Partial<BoxingPlan> = {}): BoxingPlan => ({ focus: "boxing", dumbbells: false, pattern: "180-60", minutes: 15, seed: 7, ...over });

describe("boxing rounds", () => {
  it("read the seeded reference whole: each combination a library exercise, translated, with its lesson video", () => {
    expect(G).not.toBeNull();
    expect(G.combos).toHaveLength(10);
    for (const c of G.combos) {
      const row = LIBRARY.get(c.name);
      expect(row, c.name).toBeDefined();
      expect(row!.nameFr && row!.nameDe && row!.descriptionFr && row!.descriptionDe, c.name).toBeTruthy();
      expect(demoVideo(row!.videoUrl), c.name).not.toBeNull();
      expect(row!.injuryRules, c.name).not.toBeNull();
    }
    expect(boxingFormat(G, "beginner")).toBe("120-60");
    expect(boxingFormat(G, "advanced")).toBe("180-60");
  });

  it("refuse a reference that would not make whole rounds", () => {
    const broken = (change: (g: BoxingGuidance) => void) => {
      const g = structuredClone(G);
      change(g);
      return parseBoxing(JSON.stringify(g));
    };
    expect(broken((g) => (g.formats = ["100-60"]))).toBeNull();
    expect(broken((g) => (g.formatForLevel.beginner = "60-30"))).toBeNull();
    expect(broken((g) => (g.rhythm = ["finisher" as never]))).toBeNull();
    expect(broken((g) => (g.combos = g.combos.filter((c) => c.kind !== "attack")))).toBeNull();
    expect(broken((g) => (g.combos[1].name = g.combos[0].name))).toBeNull();
  });

  it("box round after round, each closed by the burst, a rest between rounds and none at the end", () => {
    for (const format of G.formats)
      for (const minutes of G.minutes) {
        const { work, rest } = patternSeconds(format);
        const session = buildBoxingSession(G, plan({ pattern: format, minutes }));
        expect(session.rounds, `${format} ${minutes}`).toHaveLength(roundCount(format, minutes));
        for (const round of session.rounds) {
          expect(round).toHaveLength(work / G.comboSec);
          expect(round[round.length - 1].name).toBe("Shadow Boxing Speed Punches");
        }
        const rests = session.steps.filter((s) => s.type === "rest");
        expect(rests).toHaveLength(session.rounds.length - 1);
        expect(rests.every((s) => s.seconds === rest && s.type === "rest" && s.recovery)).toBe(true);
        expect(session.steps[session.steps.length - 1].type).toBe("work");
        expect(session.totalSec, `${format} ${minutes}`).toBeLessThanOrEqual(minutes * 60);
      }
    // Three-minute rounds: 15 minutes make four of them, and the rounds differ.
    const { rounds } = buildBoxingSession(G, plan());
    expect(rounds).toHaveLength(4);
    expect(rounds[0].map((e) => e.name)).not.toEqual(rounds[1].map((e) => e.name));
  });

  it("count the rounds boxed to the end", () => {
    const { steps } = buildBoxingSession(G, plan());
    const firstRound = steps.flatMap((s, i) => (s.type === "work" && s.round === 0 ? [i] : []));
    expect(roundsDone(steps, firstRound)).toBe(1);
  });

  it("leave out what loads an injury, bringing a cautious combination back only for a kind left with none", () => {
    const rules = Object.fromEntries([...LIBRARY.values()].map((r) => [r.name, r.injuryRules ?? {}]));
    const knee = boxingPool(G, [{ area: "knee" }], rules);
    expect(knee.pool.map((c) => c.name)).not.toContain("Shadow Boxing Bob and Weave");
    // The footwork has nothing else: it comes back, with caution.
    expect(knee.cautious).toEqual(["Shadow Boxing Footwork"]);
    // Every punch to avoid: the rounds still go on, with what is left.
    const avoid = Object.fromEntries(G.combos.filter((c) => c.kind === "attack" || c.kind === "finisher").map((c) => [c.name, { shoulder: "avoid" as const }]));
    const pool = boxingPool(G, [{ area: "shoulder" }], { ...rules, ...avoid }).pool;
    const session = buildBoxingSession(G, plan(), pool);
    expect(session.rounds.every((r) => r.length > 0)).toBe(true);
    expect(session.rounds.flat().some((e) => avoid[e.name])).toBe(false);
  });
});

describe("a round's length", () => {
  it("is said in minutes when whole, else in seconds", async () => {
    const { roundLength } = await import("./boxing");
    expect(roundLength(180)).toBe("3 min");
    expect(roundLength(90)).toBe("90 s");
  });
});

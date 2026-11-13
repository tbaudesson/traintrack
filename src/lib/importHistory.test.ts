import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/syncEngine", () => ({ schedulePush: () => {} }));

const { default: db, refreshCachedUserId } = await import("@/db");
const { parseHistory } = await import("./importCsv");
const { planImport, runImport } = await import("./importHistory");

const csv = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2026-10-05 18:00:00,Push,1h,Bench Press (Barbell),W,40,10,0,0,,,
2026-10-05 18:00:00,Push,1h,Bench Press (Barbell),1,100,5,0,0,,,8
2026-10-05 18:00:00,Push,1h,Bench Press (Barbell),2,100,5,0,0,,,9
2026-10-05 18:00:00,Push,1h,Zercher Squat,1,80,6,0,0,,,
2026-10-07 18:00:00,Pull,50m,Pull Up,1,0,8,0,0,,,
`;

describe("importing a history", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.authMeta.put({ key: "currentUser", userId: "me" });
    await refreshCachedUserId();
    const now = new Date().toISOString();
    for (const name of ["Barbell Bench Press", "Pull-up"]) {
      await db.exercises.add({ name, muscleGroup: "chest", isCustom: false, uuid: crypto.randomUUID(), _dirty: 0, createdAt: now, updatedAt: now });
    }
  });

  it("match or create the exercises and store done sets, warm-ups apart", async () => {
    const plan = await planImport(parseHistory(csv)!);
    expect(plan).toMatchObject({ duplicates: 0, sets: 5, created: ["Zercher Squat"] });
    expect(await runImport(plan)).toEqual({ workouts: 2, sets: 5 });

    const bench = (await db.exercises.toArray()).find((e) => e.name === "Barbell Bench Press")!;
    const sets = (await db.workoutSets.toArray()).filter((s) => s.exerciseId === bench.id);
    expect(sets.map((s) => [s.setNumber, s.isWarmup, s.weightKg, s.completed])).toEqual([
      [1, true, 40, true],
      [1, false, 100, true],
      [2, false, 100, true],
    ]);
    expect((await db.exercises.toArray()).find((e) => e.name === "Zercher Squat")?.isCustom).toBe(true);
    expect((await db.workouts.toArray()).every((w) => w.userId === "me" && w._dirty === 1)).toBe(true);
  });

  it("leave out the sessions already imported", async () => {
    await runImport(await planImport(parseHistory(csv)!));
    const again = await planImport(parseHistory(csv)!);
    expect(again).toMatchObject({ duplicates: 2, sets: 0 });
    expect(again.workouts).toEqual([]);
  });
});

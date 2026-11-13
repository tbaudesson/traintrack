import { describe, expect, it } from "vitest";
import { warmupSets } from "./warmup";
import { substitutes } from "./substitutes";
import { chainedNext, linkGroup, programGroups, restsAfter, supersetOf, unlinkAfter } from "./supersets";

describe("warm-up sets", () => {
  it("climb from the empty bar to the working weight", () => {
    expect(warmupSets(100, "barbell")).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 50, reps: 8 },
      { weightKg: 70, reps: 5 },
      { weightKg: 85, reps: 3 },
    ]);
  });

  it("skip steps lighter than the bar", () => {
    expect(warmupSets(40, "barbell")).toEqual([{ weightKg: 20, reps: 10 }, { weightKg: 27.5, reps: 5 }, { weightKg: 32.5, reps: 3 }]);
  });

  it("use the dumbbell steps", () => {
    expect(warmupSets(24, "dumbbell")).toEqual([{ weightKg: 12, reps: 10 }, { weightKg: 18, reps: 5 }]);
  });

  it("leave bodyweight work and unknown weights alone", () => {
    expect(warmupSets(0, "barbell")).toEqual([]);
    expect(warmupSets(undefined, "machine")).toEqual([]);
    expect(warmupSets(20, "bodyweight")).toEqual([]);
  });
});

describe("substitutes", () => {
  const ex = (id: number, name: string, muscleGroup: "chest" | "back", equipment: "barbell" | "dumbbell" | "machine") =>
    ({ id, name, muscleGroup, equipment });
  const bench = ex(1, "Barbell Bench Press", "chest", "barbell");
  const library = [bench, ex(2, "Pec Deck", "chest", "machine"), ex(3, "Dumbbell Bench Press", "chest", "dumbbell"), ex(4, "Barbell Row", "back", "barbell")];

  it("offer the same muscle group, what the athlete owns first", () => {
    expect(substitutes(bench, library, ["dumbbell"]).map((e) => e.id)).toEqual([3, 2]);
  });
});

describe("supersets", () => {
  const slots = [{ exerciseId: 1, group: 1 }, { exerciseId: 2, group: 1 }, { exerciseId: 3 }];

  it("rest only after the last exercise of the superset", () => {
    expect(supersetOf(1, slots)).toEqual([1, 2]);
    expect(restsAfter(1, slots)).toBe(false);
    expect(restsAfter(2, slots)).toBe(true);
    expect(restsAfter(3, slots)).toBe(true);
    expect(chainedNext(1, slots)).toBe(2);
    expect(chainedNext(2, slots)).toBeNull();
  });

  it("join an existing superset or start a new one", () => {
    expect(linkGroup(slots[1], slots[2], slots)).toBe(1);
    expect(linkGroup({ exerciseId: 3 }, { exerciseId: 4 }, slots)).toBe(2);
  });

  it("split a superset where it is cut", () => {
    const three = [{ exerciseId: 1, group: 1 }, { exerciseId: 2, group: 1 }, { exerciseId: 3, group: 1 }];
    expect([...unlinkAfter(1, three)]).toEqual([[1, null], [2, 2], [3, 2]]);
    expect([...unlinkAfter(2, three)]).toEqual([[1, 1], [2, 1], [3, null]]);
  });

  it("turn a program's links into groups", () => {
    expect(programGroups([true, false, false, true, true, false])).toEqual([1, 1, undefined, 2, 2, 2]);
  });
});

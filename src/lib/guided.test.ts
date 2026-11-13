import { describe, expect, it } from "vitest";
import { guidedCursor, guidedOrder } from "./guided";

const set = (id: number, exerciseId: number, setNumber: number, isWarmup = false) => ({ id, exerciseId, setNumber, isWarmup });

describe("guided session", () => {
  const groups: [number, ReturnType<typeof set>[]][] = [
    [1, [set(10, 1, 1, true), set(11, 1, 1), set(12, 1, 2)]],
    [2, [set(20, 2, 1), set(21, 2, 2), set(22, 2, 3)]],
    [3, [set(30, 3, 1), set(31, 3, 2)]],
    [4, [set(40, 4, 1)]],
  ];

  it("walk warm-ups first, then working sets, supersets round by round", () => {
    const supersets = new Map([[2, 7], [3, 7]]);
    expect(guidedOrder(groups, (id) => supersets.get(id) ?? null)).toEqual([10, 11, 12, 20, 30, 21, 31, 22, 40]);
  });

  it("show the chosen step, else the first one not done", () => {
    const order = [10, 11, 12];
    expect(guidedCursor(order, new Set([10]), null)).toBe(11);
    expect(guidedCursor(order, new Set([10]), 12)).toBe(12);
    expect(guidedCursor(order, new Set([10, 11, 12]), null)).toBeNull();
  });
});

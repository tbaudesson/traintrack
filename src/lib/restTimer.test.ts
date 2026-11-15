import { describe, expect, it } from "vitest";
import { clearRestEnd, loadRestEnd, saveRestEnd } from "./restTimer";

function memory() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("the end of a rest, kept across a reload", () => {
  it("is found again for its own session while it is still ahead", () => {
    const s = memory();
    saveRestEnd(12, 1_000_090_000, s);
    expect(loadRestEnd(12, 1_000_000_000, s)).toBe(1_000_090_000);
    expect(loadRestEnd(13, 1_000_000_000, s)).toBeNull();
  });

  it("counts down to the same moment: the time closed is not given back", () => {
    const s = memory();
    saveRestEnd(12, 1_000_090_000, s);
    // Reopened 60 s later: 30 s left, not 90.
    expect(loadRestEnd(12, 1_000_060_000, s)! - 1_000_060_000).toBe(30_000);
  });

  it("is forgotten once past, or when cleared", () => {
    const s = memory();
    saveRestEnd(12, 1_000_090_000, s);
    expect(loadRestEnd(12, 1_000_090_000, s)).toBeNull();
    expect(s.map.size).toBe(0);
    saveRestEnd(12, 1_000_090_000, s);
    clearRestEnd(12, s);
    expect(loadRestEnd(12, 1_000_000_000, s)).toBeNull();
  });

  it("ignores what it cannot read", () => {
    const s = memory();
    s.setItem("traintrack.rest.12", "soon");
    expect(loadRestEnd(12, 1_000_000_000, s)).toBeNull();
    expect(s.map.size).toBe(0);
  });
});

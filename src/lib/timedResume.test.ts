import { describe, expect, it } from "vitest";
import { RESUME_WINDOW_MS, clearTimedProgress, loadTimedProgress, saveTimedProgress } from "./timedResume";

function memory() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const at = 1_800_000_000_000;
const plan = { focus: "full", dumbbells: false, pattern: "40-20", minutes: 20, seed: 42 };
const progress = { kind: "intervals" as const, context: plan, stepCount: 40, index: 7, done: [0, 2, 4, 6], elapsedSec: 300, updatedAt: at };

describe("a timed session left half-way", () => {
  it("comes back as it was left, to be taken up within 6 hours", () => {
    const s = memory();
    saveTimedProgress(progress, s);
    expect(loadTimedProgress("intervals", at + 60_000, s)).toEqual({ state: "resumable", progress: { ...progress, v: 1 } });
    expect(loadTimedProgress("intervals", at + RESUME_WINDOW_MS, s)?.state).toBe("resumable");
  });

  it("after 6 hours, can only be started over or given up", () => {
    const s = memory();
    saveTimedProgress(progress, s);
    const late = loadTimedProgress("intervals", at + RESUME_WINDOW_MS + 1, s);
    expect(late?.state).toBe("expired");
    // Kept until a choice is made.
    expect(s.map.size).toBe(1);
  });

  it("does not move on while closed: the step under way and the time spent stay as they were", () => {
    const s = memory();
    saveTimedProgress(progress, s);
    const back = loadTimedProgress("intervals", at + 2 * 60 * 60 * 1000, s)!.progress;
    expect(back.index).toBe(7);
    expect(back.elapsedSec).toBe(300);
  });

  it("forgets a kept state of another version, or one it cannot read", () => {
    for (const raw of [
      JSON.stringify({ ...progress, v: 0 }),
      JSON.stringify({ ...progress, v: 2 }),
      JSON.stringify({ ...progress }), // before versions
      JSON.stringify({ ...progress, v: 1, index: 40 }), // past the end
      JSON.stringify({ ...progress, v: 1, stepCount: 0 }),
      JSON.stringify({ ...progress, v: 1, context: undefined }),
      "{not json",
    ]) {
      const s = memory();
      s.setItem("traintrack.timed.intervals", raw);
      expect(loadTimedProgress("intervals", at, s), raw).toBeNull();
      expect(s.map.size, raw).toBe(0);
    }
  });

  it("keeps only the efforts done before the step under way", () => {
    const s = memory();
    saveTimedProgress({ ...progress, done: [0, 2, 9, -1, 1.5] }, s);
    expect(loadTimedProgress("intervals", at, s)!.progress.done).toEqual([0, 2]);
  });

  it("is forgotten once cleared, and nothing is found when nothing was kept", () => {
    const s = memory();
    expect(loadTimedProgress("intervals", at, s)).toBeNull();
    saveTimedProgress(progress, s);
    clearTimedProgress("intervals", s);
    expect(loadTimedProgress("intervals", at, s)).toBeNull();
  });
});

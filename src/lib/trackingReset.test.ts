import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc: { name: string }[] = [];
const answers: Record<string, unknown> = {};
const removed: string[] = [];

vi.mock("./supabase", () => ({
  supabase: {
    rpc: async (name: string) => {
      rpc.push({ name });
      return { data: answers[name] ?? null, error: null };
    },
  },
}));
vi.mock("./syncEngine", () => ({ pushDirty: async () => {}, syncAll: async () => {} }));
vi.mock("./voiceNoteService", () => ({ deleteVoiceNote: async (path: string) => void removed.push(path) }));

const { default: db } = await import("@/db");
const { markTracking, myTrackingReset, resetMyTracking, undoMyTrackingReset } = await import("./trackingReset");

const stamp = { createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z", _dirty: 0 };
const RESET = "2026-11-28T12:00:00.123456+00:00";

async function seed() {
  const me = await db.workouts.add({ uuid: "w1", userId: "me", date: "2026-11-01", name: "Mine", ...stamp } as never);
  await db.workouts.add({ uuid: "w0", userId: "me", date: "2026-10-01", name: "Gone", deletedAt: "2026-10-02T00:00:00Z", ...stamp } as never);
  const coach = await db.workouts.add({ uuid: "w2", userId: "coach", date: "2026-11-01", name: "Coach's own", ...stamp } as never);
  await db.workoutSets.bulkAdd([
    { uuid: "s1", userId: "me", workoutId: me, setNumber: 1, ...stamp },
    { uuid: "s2", userId: "coach", workoutId: coach, setNumber: 1, ...stamp },
  ] as never);
  await db.workoutNotes.bulkAdd([
    { uuid: "n1", userId: "coach", workoutId: me, body: "Good", ...stamp },
    { uuid: "n2", userId: "me", workoutId: coach, body: "On the coach's", ...stamp },
  ] as never);
  await db.bodyMetrics.add({ uuid: "b1", userId: "me", date: "2026-11-01", ...stamp } as never);
  await db.goals.add({ uuid: "g1", userId: "me", ...stamp } as never);
  await db.programs.add({ uuid: "p1", userId: "me", name: "Kept", structure: [], ...stamp } as never);
}

const live = async () => ({
  workouts: (await db.workouts.toArray()).filter((r) => !r.deletedAt).map((r) => r.uuid),
  sets: (await db.workoutSets.toArray()).filter((r) => !r.deletedAt).map((r) => r.uuid),
  notes: (await db.workoutNotes.toArray()).filter((r) => !r.deletedAt).map((r) => r.uuid),
  body: (await db.bodyMetrics.toArray()).filter((r) => !r.deletedAt).length,
  goals: (await db.goals.toArray()).filter((r) => !r.deletedAt).length,
  programs: (await db.programs.toArray()).filter((r) => !r.deletedAt).length,
});

describe("starting one's tracking over", () => {
  beforeEach(async () => {
    rpc.length = 0;
    removed.length = 0;
    for (const k of Object.keys(answers)) delete answers[k];
    await Promise.all(db.tables.map((t) => t.clear()));
    await seed();
  });

  it("puts one's tracking aside on the device, with the server's instant, and keeps the rest", async () => {
    answers.reset_my_tracking = { resetAt: RESET, undoUntil: "2026-12-28T12:00:00+00:00" };
    const reset = await resetMyTracking("me", null);
    expect(reset.undoUntil).toBe("2026-12-28T12:00:00+00:00");
    expect(await live()).toEqual({ workouts: ["w2"], sets: ["s2"], notes: ["n2"], body: 0, goals: 0, programs: 1 });
    const w1 = await db.workouts.where("uuid").equals("w1").first();
    expect(w1).toMatchObject({ deletedAt: RESET, updatedAt: RESET, _dirty: 0 });
    // A session deleted before keeps its own deletion.
    expect((await db.workouts.where("uuid").equals("w0").first())?.deletedAt).toBe("2026-10-02T00:00:00Z");
  });

  it("brings back only what the reset put aside", async () => {
    await markTracking("me", null, RESET, RESET);
    answers.undo_my_tracking_reset = "2026-11-29T08:00:00+00:00";
    await undoMyTrackingReset("me", { resetAt: "2026-11-28T12:00:00.123Z", undoUntil: "2026-12-28T12:00:00Z" });
    expect(await live()).toEqual({ workouts: ["w1", "w2"], sets: ["s1", "s2"], notes: ["n1", "n2"], body: 1, goals: 1, programs: 1 });
    expect((await db.workouts.where("uuid").equals("w0").first())?.deletedAt).toBe("2026-10-02T00:00:00Z");
    expect((await db.workouts.where("uuid").equals("w1").first())?.updatedAt).toBe("2026-11-29T08:00:00+00:00");
  });

  it("takes along what an earlier reset still kept aside", async () => {
    const earlier = { resetAt: "2026-11-20T09:00:00+00:00", undoUntil: "2026-12-20T09:00:00+00:00" };
    await markTracking("me", null, earlier.resetAt, earlier.resetAt);
    await db.bodyMetrics.add({ uuid: "b2", userId: "me", date: "2026-11-25", ...stamp } as never);
    answers.reset_my_tracking = { resetAt: RESET, undoUntil: "2026-12-28T12:00:00+00:00" };
    await resetMyTracking("me", earlier);
    const stamps = new Set((await db.bodyMetrics.toArray()).map((b) => b.deletedAt));
    expect([...stamps]).toEqual([RESET]);
  });

  it("refuses while a change of the tracking waits to be sent", async () => {
    await db.bodyMetrics.add({ uuid: "b9", userId: "me", date: "2026-11-27", ...stamp, _dirty: 1 } as never);
    answers.reset_my_tracking = { resetAt: RESET, undoUntil: "2026-12-28T12:00:00+00:00" };
    await expect(resetMyTracking("me", null)).rejects.toThrow("pending");
    expect(rpc).toEqual([]);
  });

  it("removes one's own voice files once a reset is past its days, never a coach's", async () => {
    answers.my_tracking_reset = { purgedAudio: ["me/a.webm", "coach/b.webm"] };
    expect(await myTrackingReset("me")).toBeNull();
    expect(removed).toEqual(["me/a.webm"]);
    answers.my_tracking_reset = { resetAt: RESET, undoUntil: "2026-12-28T12:00:00+00:00" };
    expect(await myTrackingReset("me")).toEqual({ resetAt: RESET, undoUntil: "2026-12-28T12:00:00+00:00" });
  });
});

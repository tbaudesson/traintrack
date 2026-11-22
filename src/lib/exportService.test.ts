import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";

const { default: db } = await import("@/db");
const { exportJSON, isOwnRow } = await import("@/lib/exportService");

const base = { _dirty: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" };

describe("isOwnRow", () => {
  it("keeps one's own rows and rows not yet tied to an account", () => {
    expect(isOwnRow({ userId: "coach" }, "coach")).toBe(true);
    expect(isOwnRow({ userId: null }, "coach")).toBe(true);
    expect(isOwnRow({ userId: "client" }, "coach")).toBe(false);
    expect(isOwnRow({ userId: "coach", deletedAt: "2026-02-01" }, "coach")).toBe(false);
  });

  it("treats everything as one's own when signed out", () => {
    expect(isOwnRow({ userId: "client" }, null)).toBe(true);
  });
});

describe("exportJSON", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it("exports the coach's data only, never their clients'", async () => {
    await db.workouts.bulkAdd([
      { ...base, uuid: "w1", userId: "coach", date: "2026-01-02", title: "Mine" },
      { ...base, uuid: "w2", userId: "client", date: "2026-01-02", title: "Client's" },
    ] as never);
    await db.healthMetrics.bulkAdd([
      { ...base, uuid: "h1", userId: "coach", date: "2026-01-02" },
      { ...base, uuid: "h2", userId: "client", date: "2026-01-02" },
    ] as never);
    await db.messages.bulkAdd([
      { ...base, uuid: "m1", userId: "client", recipientId: "coach", body: "to me" },
      { ...base, uuid: "m2", userId: "client", recipientId: "other", body: "not mine" },
    ] as never);

    const data = JSON.parse(await exportJSON("coach"));
    expect(data.workouts.map((w: { title: string }) => w.title)).toEqual(["Mine"]);
    expect(data.healthMetrics.map((h: { uuid: string }) => h.uuid)).toEqual(["h1"]);
    expect(data.messages.map((m: { body: string }) => m.body)).toEqual(["to me"]);
    expect(data.workouts[0]._dirty).toBeUndefined();
  });

  it("includes a program a coach assigned to the client", async () => {
    await db.programs.bulkAdd([
      { ...base, uuid: "p1", userId: "coach", assignedToUserId: "client", name: "Plan", structure: [] },
      { ...base, uuid: "p2", userId: "coach", assignedToUserId: "someone", name: "Other", structure: [] },
    ] as never);
    const data = JSON.parse(await exportJSON("client"));
    expect(data.programs.map((p: { name: string }) => p.name)).toEqual(["Plan"]);
  });
});

import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Whether the server accepts pushes; a rejected upsert leaves the row dirty.
let serverAccepts = true;

vi.mock("./supabase", () => ({
  supabase: {
    from: () => ({
      upsert: async () => ({ error: serverAccepts ? null : { message: "refused" } }),
    }),
  },
}));
const net = { onLine: true };
vi.stubGlobal("navigator", net);

const db = (await import("@/db")).default;
const { flushAndClearLocalData, adoptLocalData } = await import("./syncEngine");

const metric = (dirty: number) => ({
  uuid: "11111111-1111-4111-8111-111111111111",
  date: "2026-11-08",
  weightKg: 80,
  _dirty: dirty,
});

describe("flushAndClearLocalData", () => {
  beforeEach(async () => {
    serverAccepts = true;
    net.onLine = true;
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.authMeta.put({ key: "currentUser", userId: "u1" });
  });

  it("wipes the device once everything is on the server", async () => {
    await db.table("bodyMetrics").add(metric(0));
    await db.table("bodyMetrics").add({ ...metric(1), uuid: "22222222-2222-4222-8222-222222222222" });

    await expect(flushAndClearLocalData()).resolves.toBe(true);

    await expect(db.table("bodyMetrics").count()).resolves.toBe(0);
    await expect(db.authMeta.count()).resolves.toBe(0);
  });

  it("keeps everything when offline with unsynced rows", async () => {
    net.onLine = false;
    await db.table("bodyMetrics").add(metric(1));

    await expect(flushAndClearLocalData()).resolves.toBe(false);

    await expect(db.table("bodyMetrics").count()).resolves.toBe(1);
  });

  it("keeps everything when the server refuses the rows", { timeout: 30000 }, async () => {
    serverAccepts = false;
    await db.table("bodyMetrics").add(metric(1));

    await expect(flushAndClearLocalData(25000)).resolves.toBe(false);

    await expect(db.table("bodyMetrics").count()).resolves.toBe(1);
  });
});

describe("adoptLocalData", () => {
  const U1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const U2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it("leaves the shared exercise library alone", async () => {
    await db.table("exercises").add({ uuid: U1, name: "Plank", isCustom: false, userId: null, _dirty: 0 });

    await adoptLocalData("u1");

    const ex = await db.table("exercises").get({ uuid: U1 });
    expect(ex.userId).toBeNull();
    expect(ex._dirty).toBe(0);
  });

  it("releases library rows already stuck as dirty, so sign-out can wipe", async () => {
    await db.table("exercises").add({ uuid: U1, name: "Plank", isCustom: false, userId: "u1", _dirty: 1 });

    await adoptLocalData("u1");

    await expect(flushAndClearLocalData()).resolves.toBe(true);
  });

  it("still adopts the user's own ownerless rows", async () => {
    await db.table("exercises").add({ uuid: U1, name: "Mine", isCustom: true, userId: null, _dirty: 0 });
    await db.table("bodyMetrics").add({ uuid: U2, date: "2026-11-08", userId: null, _dirty: 0 });

    await adoptLocalData("u1");

    expect((await db.table("exercises").get({ uuid: U1 }))._dirty).toBe(1);
    expect((await db.table("bodyMetrics").get({ uuid: U2 })).userId).toBe("u1");
  });
});

describe("findProgramDay", async () => {
  const { findProgramDay, programDayTitle } = await import("./startWorkout");
  const day = { name: "Day A", exercises: [] };
  const program = { name: "Full Body", structure: [day] } as unknown as import("@/db").Program;

  it("finds the day a session was started from", () => {
    expect(findProgramDay([program], programDayTitle("Full Body", "Day A"))).toBe(day);
  });

  it("finds nothing for a free session", () => {
    expect(findProgramDay([program], "Nouvelle séance")).toBeNull();
  });
});

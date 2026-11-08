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
const { flushAndClearLocalData } = await import("./syncEngine");

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

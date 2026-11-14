import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./supabase", () => ({ supabase: { from: () => ({}) } }));
vi.stubGlobal("navigator", { onLine: true });

const db = (await import("@/db")).default;
const { reconcileForeignRows } = await import("./syncEngine");

const ME = "me";
const row = (uuid: string, userId: string, extra: object = {}) => ({
  uuid, userId, date: "2026-11-10", title: "x", _dirty: 0, createdAt: "", updatedAt: "", ...extra,
});

describe("reconciling with the server", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.table("workouts").bulkAdd([
      row("own-1", ME),
      row("lea-1", "lea"),
      row("lea-2", "lea"),
      row("gone-1", "former"),
      row("gone-dirty", "former", { _dirty: 1 }),
    ]);
  });

  it("drop other people's rows the server no longer shows, keeping one's own and unsent ones", async () => {
    const asked: string[][] = [];
    const removed = await reconcileForeignRows(ME, async (table, ids) => {
      if (table === "workouts") asked.push(ids);
      return new Set(ids.filter((id) => id.startsWith("lea")));
    });
    expect(removed).toBe(1);
    expect(asked.flat().sort()).toEqual(["gone-1", "lea-1", "lea-2"]);
    const left = (await db.table("workouts").toArray()).map((w) => w.uuid).sort();
    expect(left).toEqual(["gone-dirty", "lea-1", "lea-2", "own-1"]);
  });

  it("delete nothing when the server cannot answer", async () => {
    const removed = await reconcileForeignRows(ME, async () => null);
    expect(removed).toBe(0);
    expect(await db.table("workouts").count()).toBe(5);
  });
});

import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

const upserts: { table: string; row: Record<string, unknown> }[] = [];
const server: Record<string, Record<string, unknown>[]> = {};

vi.mock("./supabase", () => ({
  supabase: {
    from: (table: string) => ({
      upsert: async (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        for (const row of Array.isArray(rows) ? rows : [rows]) upserts.push({ table, row });
        return { error: null };
      },
      select: () => ({
        in: async (_col: string, ids: string[]) => ({ data: (server[table] ?? []).filter((r) => ids.includes(r.id as string)), error: null }),
      }),
    }),
  },
}));
vi.stubGlobal("navigator", { onLine: true });

const { default: db, refreshCachedUserId } = await import("@/db");
const { pushDirty, isForeignRow } = await import("./syncEngine");

const program = (uuid: string, userId: string, name: string, dirty: number) => ({
  uuid, userId, name, structure: [], ownerUserId: userId, assignedToUserId: "client", _dirty: dirty, createdAt: "2026-11-01", updatedAt: "2026-11-20",
});

describe("rows held by another account", () => {
  beforeEach(async () => {
    upserts.length = 0;
    for (const k of Object.keys(server)) delete server[k];
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.authMeta.put({ key: "currentUser", userId: "client" });
    await refreshCachedUserId();
  });

  it("are recognised by their account", () => {
    expect(isForeignRow({ userId: "coach" }, "client")).toBe(true);
    expect(isForeignRow({ userId: "client" }, "client")).toBe(false);
    expect(isForeignRow({ userId: null }, "client")).toBe(false);
  });

  it("are never sent under the client's id, and come back as the server has them", async () => {
    await db.programs.bulkAdd([program("coach-plan", "coach", "Changed locally", 1), program("mine", "client", "Mine", 1)] as never);
    server.programs = [
      { id: "coach-plan", user_id: "coach", name: "Coach's plan", structure: [], owner_user_id: "coach", assigned_to_user_id: "client", created_at: "2026-11-01", updated_at: "2026-11-10" },
    ];

    await pushDirty();

    expect(upserts.filter((u) => u.table === "programs").map((u) => u.row.id)).toEqual(["mine"]);
    const restored = await db.programs.where("uuid").equals("coach-plan").first();
    expect(restored?.name).toBe("Coach's plan");
    expect(restored?._dirty).toBe(0);
    expect(restored?.userId).toBe("coach");
  });

  it("stop waiting when the server no longer shows them", async () => {
    await db.programs.add(program("gone", "coach", "Gone", 1) as never);
    await pushDirty();
    expect(upserts).toEqual([]);
    expect((await db.programs.where("uuid").equals("gone").first())?._dirty).toBe(0);
  });
});

describe("sending rows in batches", () => {
  it("only groups rows carrying the same fields", async () => {
    const { byShape } = await import("./syncEngine");
    const groups = byShape([
      { row: { id: "a", name: "x", note: undefined } },
      { row: { id: "b", name: "y" } },
      { row: { id: "c", name: "z", note: "n" } },
    ]);
    expect(groups.map((g) => g.map((x) => x.row.id))).toEqual([["a", "b"], ["c"]]);
  });
});

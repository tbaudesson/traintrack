import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/syncEngine", () => ({ schedulePush: () => {} }));

const { default: db, refreshCachedUserId } = await import("@/db");
const { assignProgramToClients, createProgram } = await import("@/hooks/usePrograms");

const structure = [{ name: "Day A", exercises: [] }];
const members = [{ userId: "lea", groupId: "g1" }, { userId: "tom", groupId: "g1" }];

describe("assignProgramToClients", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.authMeta.put({ key: "currentUser", userId: "coach" });
    await refreshCachedUserId();
  });

  it("gives each client their own copy and leaves the model unassigned", async () => {
    const id = await createProgram({ name: "Force", structure });
    const model = (await db.programs.get(id))!;

    expect(await assignProgramToClients(model, members)).toEqual({ created: 2, updated: 0 });

    const all = await db.programs.toArray();
    expect(all.filter((p) => p.assignedToUserId).map((p) => p.assignedToUserId).sort()).toEqual(["lea", "tom"]);
    expect((await db.programs.get(id))!.assignedToUserId).toBeNull();
  });

  it("updates existing copies instead of duplicating them", async () => {
    const id = await createProgram({ name: "Force", structure });
    const model = (await db.programs.get(id))!;
    await assignProgramToClients(model, members);

    const changed = { ...model, structure: [{ name: "Day B", exercises: [] }] };
    expect(await assignProgramToClients(changed, members)).toEqual({ created: 0, updated: 2 });

    const copies = (await db.programs.toArray()).filter((p) => p.assignedToUserId);
    expect(copies).toHaveLength(2);
    expect(copies.every((p) => p.structure[0].name === "Day B")).toBe(true);
  });
});

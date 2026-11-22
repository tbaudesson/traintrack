import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/syncEngine", () => ({ schedulePush: () => {} }));

const { default: db, refreshCachedUserId } = await import("@/db");
const { updateProgram, deleteProgram, setProgramFavorite } = await import("@/hooks/usePrograms");
const { canEditProgram } = await import("@/lib/programOrigin");

describe("a coach's program on the client's device", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.authMeta.put({ key: "currentUser", userId: "client" });
    await refreshCachedUserId();
  });

  it("is read-only to the client, editable by its holder", () => {
    expect(canEditProgram({ userId: "coach" }, "client")).toBe(false);
    expect(canEditProgram({ userId: "client" }, "client")).toBe(true);
    expect(canEditProgram({ userId: null }, "client")).toBe(true);
    expect(canEditProgram({ userId: "coach" }, null)).toBe(true);
  });

  it("is never changed, favourited or deleted from here", async () => {
    const id = (await db.programs.add({
      uuid: "p", userId: "coach", ownerUserId: "coach", assignedToUserId: "client", name: "Plan", structure: [], _dirty: 0, createdAt: "", updatedAt: "",
    } as never)) as number;

    expect(await updateProgram(id, { name: "Mine now" })).toBe(false);
    await setProgramFavorite(id, true);
    expect(await deleteProgram(id)).toBe(false);

    const p = (await db.programs.get(id))!;
    expect(p).toMatchObject({ name: "Plan", _dirty: 0 });
    expect(p.favorite).toBeFalsy();
    expect(p.deletedAt).toBeFalsy();
  });
});

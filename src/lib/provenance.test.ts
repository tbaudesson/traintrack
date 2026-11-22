import { describe, expect, it } from "vitest";
import { alreadyImported, fileHash } from "./provenance";

const w = (id: number, extra: object = {}) => ({ id, date: "2026-11-20", title: `#${id}`, sport: "run" as const, ...extra });

describe("an outing imported twice", () => {
  it("is found by its file", () => {
    const list = [w(1, { fileHash: "abc" }), w(2)];
    expect(alreadyImported(list, { hash: "abc" })?.id).toBe(1);
    expect(alreadyImported(list, { hash: "abc" }, 1)).toBeUndefined();
  });

  it("is found by its start, whatever the format it was exported in", () => {
    const list = [w(1, { startedAt: "2026-11-20T07:00:00.000Z", fileHash: "fit" })];
    expect(alreadyImported(list, { hash: "tcx", sport: "run", startedAt: "2026-11-20T07:01:00Z" })?.id).toBe(1);
    expect(alreadyImported(list, { hash: "tcx", sport: "bike", startedAt: "2026-11-20T07:01:00Z" })).toBeUndefined();
    expect(alreadyImported(list, { hash: "tcx", sport: "run", startedAt: "2026-11-20T09:00:00Z" })).toBeUndefined();
  });

  it("is not a deleted session", () => {
    expect(alreadyImported([w(1, { fileHash: "abc", deletedAt: "2026-11-21" })], { hash: "abc" })).toBeUndefined();
  });

  it("has a stable fingerprint", async () => {
    const bytes = new TextEncoder().encode("abc").buffer;
    expect(await fileHash(bytes)).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

import { describe, expect, it } from "vitest";
import { inviteLink, inviteState, tokenFromHash } from "./inviteService";

const token = "0123456789abcdef".repeat(4);

describe("invitation links", () => {
  it("put the token after the #, which never reaches a server", () => {
    expect(inviteLink("https://app.example", "fr", token)).toBe(`https://app.example/fr/join#${token}`);
  });

  it("read only a well-formed token", () => {
    expect(tokenFromHash(`#${token}`)).toBe(token);
    expect(tokenFromHash(token)).toBe(token);
    expect(tokenFromHash("#abc")).toBeNull();
    expect(tokenFromHash(`#${token.toUpperCase()}`)).toBeNull();
    expect(tokenFromHash(`#${token}<script>`)).toBeNull();
  });

  it("tell an open link from a used, revoked or expired one", () => {
    const now = Date.parse("2026-11-14T12:00:00Z");
    const base = { usedAt: null, revokedAt: null, expiresAt: "2026-11-28T12:00:00Z" };
    expect(inviteState(base, now)).toBe("open");
    expect(inviteState({ ...base, usedAt: "2026-11-15T08:00:00Z" }, now)).toBe("used");
    expect(inviteState({ ...base, revokedAt: "2026-11-14T08:00:00Z" }, now)).toBe("revoked");
    expect(inviteState({ ...base, expiresAt: "2026-11-14T11:59:00Z" }, now)).toBe("expired");
  });
});

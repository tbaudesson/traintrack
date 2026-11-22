import { describe, expect, it } from "vitest";
import { readChoice, reconcileChoice, storeChoice } from "./sportChoice";

const none = { sport: null, sport2: null, allSports: false };

describe("the favourite sport kept with the profile", () => {
  it("is stored as a sport, 'all' or 'none', and read back", () => {
    const run = { sport: "running" as const, sport2: "cycling" as const, allSports: false };
    expect(storeChoice(run)).toEqual({ favoriteSport: "running", secondSport: "cycling" });
    expect(readChoice(storeChoice(run))).toEqual(run);
    expect(storeChoice({ ...none, allSports: true })).toEqual({ favoriteSport: "all", secondSport: null });
    expect(readChoice({ favoriteSport: "none", secondSport: null })).toEqual(none);
    expect(readChoice({ favoriteSport: null })).toBeNull();
    expect(readChoice({ favoriteSport: "curling" })).toBeNull();
  });

  it("comes from the profile once chosen anywhere", () => {
    expect(reconcileChoice(none, { favoriteSport: "swimming", secondSport: null })).toEqual({ kind: "useProfile", choice: { sport: "swimming", sport2: null, allSports: false } });
    expect(reconcileChoice({ sport: "swimming", sport2: null, allSports: false }, { favoriteSport: "swimming", secondSport: null })).toBeNull();
  });

  it("is handed to a profile that has none yet, never the default", () => {
    expect(reconcileChoice({ sport: "hiking", sport2: null, allSports: false }, { favoriteSport: null })).toEqual({ kind: "saveToProfile", stored: { favoriteSport: "hiking", secondSport: null } });
    expect(reconcileChoice(none, { favoriteSport: null })).toBeNull();
  });
});

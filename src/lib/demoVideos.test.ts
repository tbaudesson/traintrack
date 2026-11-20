import { describe, expect, it } from "vitest";
import { demoVideo, isPlayable } from "./demoVideos";
import { VAULTING_EXERCISES } from "./vaultingExercises";
import { libraryFromMigrations } from "./libraryFromMigrations";
import { mobilityFromMigrations, timedFromMigrations } from "./injuryGuidanceFromMigrations";

const LIBRARY = new Map(libraryFromMigrations().map((r) => [r.name, r]));

describe("demo videos", () => {
  it("cover every move of the timed sessions, the vaulting and the warm-ups", () => {
    for (const e of timedFromMigrations().exercises) expect(demoVideo(LIBRARY.get(e.name)?.videoUrl), e.name).not.toBeNull();
    for (const e of VAULTING_EXERCISES) expect(demoVideo(LIBRARY.get(e.name)?.videoUrl), e.name).not.toBeNull();
    for (const e of mobilityFromMigrations().moves) expect(demoVideo(e.video), e.key).not.toBeNull();
  });

  it("all play inline", () => {
    for (const r of LIBRARY.values()) if (r.videoUrl) expect(isPlayable(r.videoUrl), r.name).toBe(true);
    for (const e of mobilityFromMigrations().moves) if (e.video) expect(isPlayable(e.video), e.key).toBe(true);
  });

  it("prefer a video set in the database, but not a search page", () => {
    expect(demoVideo("https://www.youtube.com/watch?v=abcdefghijk")).toBe("https://www.youtube.com/watch?v=abcdefghijk");
    expect(demoVideo("https://www.youtube.com/results?search_query=burpee")).toBeNull();
  });
});

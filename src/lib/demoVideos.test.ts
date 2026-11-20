import { describe, expect, it } from "vitest";
import { DEMO_VIDEOS, demoVideo, isPlayable, mobilityDemo } from "./demoVideos";
import { INTERVAL_EXERCISES } from "./intervals";
import { VAULTING_EXERCISES } from "./vaultingExercises";
import { MOBILITY_EXERCISES } from "./mobility";
import { libraryFromMigrations } from "./libraryFromMigrations";

const LIBRARY = new Map(libraryFromMigrations().map((r) => [r.name, r]));


describe("demo videos", () => {
  it("cover every move of the timed sessions, the vaulting and the warm-ups", () => {
    for (const e of INTERVAL_EXERCISES) expect(demoVideo(LIBRARY.get(e.name)?.videoUrl), e.name).not.toBeNull();
    for (const e of VAULTING_EXERCISES) expect(demoVideo(LIBRARY.get(e.name)?.videoUrl), e.name).not.toBeNull();
    for (const e of MOBILITY_EXERCISES) expect(mobilityDemo(e.key), e.key).not.toBeNull();
  });

  it("all play inline", () => {
    for (const url of Object.values(DEMO_VIDEOS)) expect(isPlayable(url), url).toBe(true);
  });

  it("prefer a video set in the database, but not a search page", () => {
    expect(demoVideo("https://www.youtube.com/watch?v=abcdefghijk")).toBe("https://www.youtube.com/watch?v=abcdefghijk");
    expect(demoVideo("https://www.youtube.com/results?search_query=burpee")).toBeNull();
  });
});

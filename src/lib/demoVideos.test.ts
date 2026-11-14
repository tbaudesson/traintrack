import { describe, expect, it } from "vitest";
import { DEMO_VIDEOS, demoVideo, isPlayable, mobilityDemo } from "./demoVideos";
import { INTERVAL_EXERCISES } from "./intervals";
import { VAULTING_EXERCISES } from "./vaultingExercises";
import { MOBILITY_EXERCISES } from "./mobility";

describe("demo videos", () => {
  it("cover every move of the timed sessions, the vaulting and the warm-ups", () => {
    for (const e of INTERVAL_EXERCISES) expect(demoVideo(e.name), e.name).not.toBeNull();
    for (const e of VAULTING_EXERCISES) expect(demoVideo(e.name), e.name).not.toBeNull();
    for (const e of MOBILITY_EXERCISES) expect(mobilityDemo(e.key), e.key).not.toBeNull();
  });

  it("all play inline", () => {
    for (const url of Object.values(DEMO_VIDEOS)) expect(isPlayable(url), url).toBe(true);
  });

  it("prefer a video set in the database, but not a search page", () => {
    expect(demoVideo("Burpee", "https://www.youtube.com/watch?v=abcdefghijk")).toBe("https://www.youtube.com/watch?v=abcdefghijk");
    expect(demoVideo("Burpee", "https://www.youtube.com/results?search_query=burpee")).toBe(DEMO_VIDEOS.Burpee);
  });
});

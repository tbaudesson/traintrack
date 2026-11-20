import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { demoVideo, isPlayable } from "./demoVideos";
import { libraryFromMigrations } from "./libraryFromMigrations";
import { mobilityFromMigrations, timedFromMigrations } from "./injuryGuidanceFromMigrations";

/** The exercises migration 040 adds for vaulting (off the horse), from that migration. */
const VAULTING_NAMES = (() => {
  const sql = readFileSync("supabase/migrations/040_vaulting.sql", "utf8");
  const block = sql.slice(sql.indexOf("INSERT INTO exercises"), sql.indexOf("INSERT INTO program_templates"));
  return [...block.matchAll(/^  \('((?:[^']|'')+)'/gm)].map((m) => m[1].replace(/''/g, "'"));
})();

const LIBRARY = new Map(libraryFromMigrations().map((r) => [r.name, r]));

describe("demo videos", () => {
  it("cover every move of the timed sessions, the vaulting and the warm-ups", () => {
    for (const e of timedFromMigrations().exercises) expect(demoVideo(LIBRARY.get(e.name)?.videoUrl), e.name).not.toBeNull();
    for (const name of VAULTING_NAMES) expect(demoVideo(LIBRARY.get(name)?.videoUrl), name).not.toBeNull();
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

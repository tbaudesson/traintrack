import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPlaylistOf, musicTarget, parseMusicApps, readMusicChoice } from "./music";

// The reference as migration 083 seeds it.
const sql = readFileSync("supabase/migrations/083_music_apps.sql", "utf8");
const seeded = sql.slice(sql.indexOf("'\n[") + 1, sql.indexOf("]\n'") + 1);
const apps = parseMusicApps(seeded)!;
const spotify = apps.find((a) => a.id === "spotify")!;

describe("music", () => {
  it("reads the seeded apps whole, Spotify among them", () => {
    expect(apps.map((a) => a.name)).toEqual(["Spotify", "Apple Music", "Deezer", "YouTube Music", "Qobuz"]);
    expect(spotify.appUrl).toBe("spotify:");
  });

  it("refuses a list that would open a script or a page of the web as an app, or a web player not in https", () => {
    const one = (change: object) => JSON.stringify([{ ...spotify, ...change }]);
    expect(parseMusicApps(one({ appUrl: "javascript:alert(1)" }))).toBeNull();
    expect(parseMusicApps(one({ appUrl: "http://evil.example" }))).toBeNull();
    expect(parseMusicApps(one({ webUrl: "http://open.spotify.com" }))).toBeNull();
    expect(parseMusicApps(one({ playlistPrefixes: ["ftp://x"] }))).toBeNull();
    expect(parseMusicApps(one({ id: "Spotify!" }))).toBeNull();
    expect(parseMusicApps(JSON.stringify([spotify, spotify]))).toBeNull();
    expect(parseMusicApps("[]")).toBeNull();
    expect(parseMusicApps("not json")).toBeNull();
  });

  it("takes only a playlist of the app chosen", () => {
    expect(isPlaylistOf(spotify, "https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP?si=1")).toBe(true);
    expect(isPlaylistOf(spotify, "https://music.apple.com/fr/playlist/x")).toBe(false);
    expect(isPlaylistOf(spotify, "https://open.spotify.com.evil.example/playlist")).toBe(false);
  });

  it("opens the playlist, else the app on a phone and its web player on a computer", () => {
    const list = "https://open.spotify.com/playlist/abc";
    expect(musicTarget(spotify, list, true)).toEqual({ url: list, external: false });
    expect(musicTarget(spotify, null, true)).toEqual({ url: "spotify:", external: true });
    expect(musicTarget(spotify, null, false)).toEqual({ url: "https://open.spotify.com", external: false });
  });

  it("keeps a choice made on the device, and drops a link that is not https", () => {
    expect(readMusicChoice({ app: "spotify", playlist: "https://open.spotify.com/playlist/abc" })).toEqual({ app: "spotify", playlist: "https://open.spotify.com/playlist/abc" });
    expect(readMusicChoice({ app: "spotify", playlist: "javascript:alert(1)" })).toEqual({ app: "spotify", playlist: null });
    expect(readMusicChoice({ app: 3 })).toBeNull();
    expect(readMusicChoice(null)).toBeNull();
  });
});

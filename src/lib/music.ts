/**
 * Music during a session: the app does not play any, it opens the athlete's
 * own music app (on its playlist, when one was given) and the session goes on
 * meanwhile. Which apps can be chosen, and how each opens, is a reference an
 * admin keeps (app settings, Admin > Music).
 */

/** The app settings key of the reference. */
export const MUSIC_KEY = "music_apps";

export interface MusicApp {
  /** Kept on the device as the athlete's choice. */
  id: string;
  name: string;
  /** Opens the installed app on a phone (its own scheme, e.g. "spotify:"). */
  appUrl: string;
  /** Opens it in the browser, on a computer. */
  webUrl: string;
  /** The beginnings of a share link of a playlist of this app ("https://open.spotify.com/"). */
  playlistPrefixes: string[];
}

/** The athlete's choice, kept on the device (another device may have another app). */
export interface MusicChoice {
  app: string;
  playlist: string | null;
}

const ID = /^[a-z0-9-]{1,30}$/;
// An app's own scheme: never a page of the web, nor anything that would run in ours.
const SCHEME = /^(?!(?:javascript|data|vbscript|file|blob|https?):)[a-z][a-z0-9+.-]*:/i;
const isHttps = (url: unknown): url is string => {
  if (typeof url !== "string") return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

/** The reference as the admin keeps it; null when it does not hold together. */
export function parseMusicApps(text: string | null | undefined): MusicApp[] | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as unknown;
    if (!Array.isArray(value) || !value.length) return null;
    const apps: MusicApp[] = [];
    for (const item of value as Record<string, unknown>[]) {
      if (!item || typeof item !== "object") return null;
      const { id, name, appUrl, webUrl, playlistPrefixes } = item;
      if (typeof id !== "string" || !ID.test(id) || apps.some((a) => a.id === id)) return null;
      if (typeof name !== "string" || !name.trim()) return null;
      if (typeof appUrl !== "string" || !SCHEME.test(appUrl)) return null;
      if (!isHttps(webUrl)) return null;
      if (!Array.isArray(playlistPrefixes) || !playlistPrefixes.every(isHttps)) return null;
      apps.push({ id, name: name.trim(), appUrl, webUrl, playlistPrefixes });
    }
    return apps;
  } catch {
    return null;
  }
}

/** The choice as kept on the device, or null. */
export function readMusicChoice(value: unknown): MusicChoice | null {
  if (!value || typeof value !== "object") return null;
  const { app, playlist } = value as Record<string, unknown>;
  if (typeof app !== "string" || !ID.test(app)) return null;
  return { app, playlist: isHttps(playlist) ? playlist : null };
}

/** Whether a link is a playlist (or album, or artist) of this app: a link to elsewhere is refused. */
export const isPlaylistOf = (app: MusicApp, link: string): boolean =>
  isHttps(link) && app.playlistPrefixes.some((prefix) => link.startsWith(prefix));

/**
 * Where a tap on "Music" leads: the playlist when there is one (the phone
 * opens it in the app), else the app itself on a phone, its web player on a
 * computer.
 */
export function musicTarget(app: MusicApp, playlist: string | null, onPhone: boolean): { url: string; external: boolean } {
  if (playlist && isPlaylistOf(app, playlist)) return { url: playlist, external: false };
  return onPhone ? { url: app.appUrl, external: true } : { url: app.webUrl, external: false };
}

/** Opens the music; the session stays where it is. */
export function openMusic(app: MusicApp, playlist: string | null): void {
  const onPhone = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const { url, external } = musicTarget(app, playlist, onPhone);
  // The app's own scheme hands over to it without leaving the page; a link opens beside it.
  if (external) window.open(url, "_self");
  else window.open(url, "_blank", "noopener");
}

const setAudioSession = (type: "ambient" | "auto") => {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== type) session.type = type;
  } catch {
    // Not supported: the system decides.
  }
};

/**
 * Beeps and the voice coach over the music rather than in its place: on the
 * browsers that let a page say so (Safari), its sounds mix with the music.
 */
export const mixWithMusic = () => setAudioSession("ambient");

/** Before the microphone records: the system picks the audio session again (a mixing one may not record). */
export const audioSessionForRecording = () => setAudioSession("auto");

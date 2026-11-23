import { useAppGuidance } from "@/hooks/useAppGuidance";
import { MUSIC_KEY, parseMusicApps, type MusicApp } from "@/lib/music";

/** The music apps one can open from a session, as the admin keeps them; null until read once. */
export const useMusicApps = (): MusicApp[] | null => useAppGuidance(MUSIC_KEY, parseMusicApps);

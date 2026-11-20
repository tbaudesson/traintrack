/**
 * Demonstration videos of the warm-up moves and stretches, by the move's key.
 * Library exercises carry theirs in the database (video_url, seeded by
 * migration 064, edited by an admin).
 */
export const DEMO_VIDEOS: Record<string, string> = {
  "arm-circles": "https://www.youtube.com/watch?v=UVMEnIaY8aU",
  "arm-swings": "https://www.youtube.com/watch?v=AsMMF3YWIIM",
  "torso-twists": "https://www.youtube.com/watch?v=h6XyzlM8m24",
  "hip-circles": "https://www.youtube.com/watch?v=qkrJXGVj_OQ",
  "leg-swings": "https://www.youtube.com/watch?v=naW8u72lOzI",
  "knee-hug": "https://www.youtube.com/watch?v=s2emWIC58bI",
  "lunge-rotation": "https://www.youtube.com/watch?v=G65aplILBXs",
  "worlds-greatest": "https://www.youtube.com/watch?v=ftLV1SkpWAA",
  "scapular-pushup": "https://www.youtube.com/watch?v=tu9DyLjSd4Y",
  "cat-cow": "https://www.youtube.com/watch?v=1Y0YjXS9sKI",
  "neck-side": "https://www.youtube.com/watch?v=54y0JAT46vE",
  "chest-doorway": "https://www.youtube.com/watch?v=M850sCj9LHQ",
  "cross-shoulder": "https://www.youtube.com/watch?v=Pg0JvLSfWwM",
  triceps: "https://www.youtube.com/watch?v=MWzR-WE_nhU",
  "biceps-wall": "https://www.youtube.com/watch?v=BzPzDuIn1PA",
  "side-bend": "https://www.youtube.com/watch?v=Vko-SJok-fk",
  quad: "https://www.youtube.com/watch?v=j-KreYRNOCc",
  calf: "https://www.youtube.com/watch?v=_QWfhbIioy8",
  "hip-flexor": "https://www.youtube.com/watch?v=34SlL-PPCWQ",
  hamstring: "https://www.youtube.com/watch?v=u55F2jOzBVI",
  butterfly: "https://www.youtube.com/watch?v=MHwUChXNy-Y",
  pigeon: "https://www.youtube.com/watch?v=lqCqETr7Q0g",
  "spinal-twist": "https://www.youtube.com/watch?v=G28BnPX-tlA",
  cobra: "https://www.youtube.com/watch?v=JDcdhTuycOI",
  "childs-pose": "https://www.youtube.com/watch?v=LZgABs0IggM",
  "jumping-jack": "https://www.youtube.com/watch?v=nGaXj3kkmrU",
  "high-knees": "https://www.youtube.com/watch?v=oDdkytliOqE",
  "squat": "https://www.youtube.com/watch?v=P-yaD24bUE8",
  "inchworm": "https://www.youtube.com/watch?v=SCJ9qcNPEOQ",
  "glute-bridge": "https://www.youtube.com/watch?v=L9KZfxT654Y",
};

/** The demo of a warm-up move or a stretch, by its key. */
export const mobilityDemo = (key: string): string | null => DEMO_VIDEOS[key] ?? null;

/** A link that plays inline: a specific YouTube or Vimeo video, not a search page. */
export const isPlayable = (url: string | null | undefined): url is string =>
  !!url && /(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/|vimeo\.com\/\d)/.test(url);

/** The demo of a library exercise: its video in the database (seeded by migration 064, edited by an admin), when it plays inline. */
export function demoVideo(fromDatabase?: string | null): string | null {
  return isPlayable(fromDatabase) ? fromDatabase : null;
}

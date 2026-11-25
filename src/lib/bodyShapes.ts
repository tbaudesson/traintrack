import type { Muscle } from "@/db";
import type { PainArea } from "./pain";

/**
 * The drawing of the body map: a plain, stylised body seen from the front and
 * from the back (viewBox 120 × 256, centred on x = 60). Each muscle is drawn
 * on the left half and mirrored, but for those across the middle. The
 * silhouette underneath is made of simple shapes; the joints are where an
 * injury is marked.
 */
export type View = "front" | "back";

export interface MuscleShape {
  muscle: Muscle;
  d: string;
  /** Drawn once, across the middle (the traps), instead of mirrored. */
  single?: boolean;
}

export const VIEW_BOX = "0 0 120 256";
/** Mirrors the left half onto the right. */
export const MIRROR = "matrix(-1 0 0 1 120 0)";

/** The silhouette, left half (mirrored), then the head and neck. */
export const SILHOUETTE = {
  torso: "M60,40 L45,41 C36,42 30,44 27,50 C25,55 26,61 30,66 C33,78 35,92 36,104 C36,112 35,118 37,124 C39,130 46,133 60,133 Z",
  upperArm: "M27,49 C23,58 21,74 21,92 L31,93 C33,80 34,66 34,55 Z",
  forearm: "M21,92 C17,104 15,117 14,129 L22,130 C25,118 29,105 31,93 Z",
  hand: "M14,129 C11,134 11,142 14,146 C17,148 21,146 22,142 L22,130 Z",
  thigh: "M37,122 C34,140 35,160 38,178 L53,178 C55,162 58,146 60,132 Z",
  shin: "M38,178 C36,196 37,214 40,232 L48,232 C50,214 52,196 53,178 Z",
  foot: "M39,231 C35,236 34,242 37,245 L49,245 C50,240 49,235 48,231 Z",
  head: "M60,6 C51,6 47,13 47,21 C47,29 52,34 60,34 C68,34 73,29 73,21 C73,13 69,6 60,6 Z",
  neck: "M54,31 L66,31 L67,42 L53,42 Z",
} as const;

export const SHAPES: Record<View, MuscleShape[]> = {
  front: [
    { muscle: "chest", d: "M59,46 L45,45 C39,47 36,53 37,60 C39,67 47,71 59,69 Z" },
    { muscle: "front_delts", d: "M43,43 C36,41 30,44 28,50 C28,55 29,58 31,61 C33,55 36,51 41,48 Z" },
    { muscle: "side_delts", d: "M27,51 C25,55 25,60 26,64 L30,62 C28,59 27,56 27,51 Z" },
    { muscle: "biceps", d: "M29,65 C25,72 23,81 23,89 C25,91 29,91 31,89 C33,81 34,73 34,64 Z" },
    { muscle: "forearms", d: "M22,95 C19,105 17,115 16,126 L22,127 C25,116 28,106 30,95 Z" },
    { muscle: "abs", d: "M53,73 L59,73 L59,84 L53,84 C52,80 52,76 53,73 Z" },
    { muscle: "abs", d: "M53,86 L59,86 L59,97 L53,97 C52,93 52,90 53,86 Z" },
    { muscle: "abs", d: "M53,99 L59,99 L59,114 C56,114 54,112 53,110 C52,106 52,102 53,99 Z" },
    { muscle: "obliques", d: "M50,73 C45,74 41,78 40,86 C39,96 41,106 45,114 L51,112 C50,100 50,86 50,73 Z" },
    { muscle: "quads", d: "M39,124 C35,138 35,156 38,172 C41,176 46,177 50,173 C52,160 52,142 50,128 C46,126 42,124 39,124 Z" },
    { muscle: "adductors", d: "M52,129 C55,140 56,152 55,166 C57,164 59,152 59.5,135 C57,132 55,130 52,129 Z" },
    { muscle: "calves", d: "M40,186 C38,198 39,212 41,224 L45,224 C46,212 47,198 45,186 Z" },
  ],
  back: [
    { muscle: "traps", single: true, d: "M60,32 C56,37 50,41 43,44 C49,49 54,58 57,72 L60,77 L63,72 C66,58 71,49 77,44 C70,41 64,37 60,32 Z" },
    { muscle: "rear_delts", d: "M42,44 C36,42 30,44 28,50 C28,55 29,58 31,61 C33,55 37,51 41,49 Z" },
    { muscle: "side_delts", d: "M27,51 C25,55 25,60 26,64 L30,62 C28,59 27,56 27,51 Z" },
    { muscle: "triceps", d: "M29,65 C25,72 23,81 23,89 C25,91 29,91 31,89 C33,81 34,73 34,64 Z" },
    { muscle: "forearms", d: "M22,95 C19,105 17,115 16,126 L22,127 C25,116 28,106 30,95 Z" },
    { muscle: "lats", d: "M42,52 C39,60 38,72 41,84 C44,90 49,94 54,96 C55,86 56,78 56,74 C52,64 47,57 42,52 Z" },
    { muscle: "lower_back", d: "M56,80 C55,90 54,100 55,112 L59,112 L59,82 Z" },
    { muscle: "obliques", d: "M41,88 C39,96 40,106 43,113 L51,112 C49,106 47,100 46,93 C44,92 42,90 41,88 Z" },
    { muscle: "glutes", d: "M59,116 C52,114 44,116 40,122 C38,130 40,138 46,142 C52,144 57,142 59,138 Z" },
    { muscle: "hamstrings", d: "M40,145 C37,156 38,166 40,174 C44,177 49,177 52,173 C54,163 54,153 52,146 C48,144 44,144 40,145 Z" },
    { muscle: "calves", d: "M39,184 C36,192 37,204 40,214 C42,218 46,218 48,214 C50,204 50,192 48,184 C45,181 42,181 39,184 Z" },
  ],
};

/** Where each joint is marked when injured, on the views that show it (left half; mirrored but for the spine). */
export const JOINTS: Partial<Record<PainArea, { view: View; x: number; y: number; single?: boolean }[]>> = {
  neck: [{ view: "front", x: 60, y: 37, single: true }, { view: "back", x: 60, y: 37, single: true }],
  shoulder: [{ view: "front", x: 32, y: 49 }, { view: "back", x: 32, y: 49 }],
  elbow: [{ view: "front", x: 26, y: 92 }, { view: "back", x: 26, y: 92 }],
  wrist: [{ view: "front", x: 18, y: 128 }, { view: "back", x: 18, y: 128 }],
  upper_back: [{ view: "back", x: 60, y: 58, single: true }],
  lower_back: [{ view: "back", x: 60, y: 102, single: true }],
  hip: [{ view: "front", x: 40, y: 122 }, { view: "back", x: 40, y: 122 }],
  knee: [{ view: "front", x: 46, y: 180 }, { view: "back", x: 46, y: 180 }],
  ankle: [{ view: "front", x: 44, y: 230 }, { view: "back", x: 44, y: 230 }],
};

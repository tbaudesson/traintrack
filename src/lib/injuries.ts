import type { PainArea } from "./pain";

/** An injury the athlete declared: where, and since when (YYYY-MM-DD). */
export interface Injury {
  area: PainArea;
  since: string;
}

/** The areas an athlete can declare: those of the pain reports, without "other". */
export const INJURY_AREAS: PainArea[] = ["shoulder", "elbow", "wrist", "neck", "upper_back", "lower_back", "hip", "knee", "ankle"];

/** "avoid": better left out while injured. "caution": possible, lighter and without pain. */
export type InjuryLevel = "avoid" | "caution";

type Rules = Partial<Record<PainArea, InjuryLevel>>;
const A = "avoid" as const;
const C = "caution" as const;

/**
 * What each library exercise loads, by area. Kept simple on purpose: an
 * exercise is "avoid" where it loads the injured joint heavily or in its
 * riskiest position (overhead pressing for a shoulder, spinal loading for the
 * lower back, jumping for a knee or an ankle), "caution" where it loads it
 * less. Exercises left out load nothing worth a warning.
 */
export const INJURY_RULES: Record<string, Rules> = {
  // Chest
  "Barbell Bench Press": { shoulder: C, elbow: C, wrist: C },
  "Incline Barbell Bench Press": { shoulder: C, elbow: C, wrist: C },
  "Dumbbell Bench Press": { shoulder: C, elbow: C },
  "Incline Dumbbell Press": { shoulder: C, elbow: C },
  "Cable Fly": { shoulder: C },
  "Push-up": { shoulder: C, wrist: C, elbow: C },
  "Chest Dip": { shoulder: A, elbow: C, wrist: C },
  // Back
  Deadlift: { lower_back: A, shoulder: A, upper_back: C, hip: C, knee: C },
  "Barbell Row": { lower_back: A, upper_back: C, shoulder: C, elbow: C },
  "Pull-up": { shoulder: A, elbow: C, wrist: C },
  "Chin-up": { shoulder: A, elbow: C, wrist: C },
  "Lat Pulldown": { shoulder: C, elbow: C },
  "Seated Cable Row": { lower_back: C, shoulder: C },
  "Dumbbell Row": { lower_back: C, shoulder: C },
  "T-Bar Row": { lower_back: A, upper_back: C, shoulder: C },
  "Straight-Arm Pulldown": { shoulder: C },
  // Legs
  "Back Squat": { knee: A, lower_back: A, shoulder: C, neck: C, hip: C, ankle: C },
  "Front Squat": { knee: A, lower_back: C, wrist: C, hip: C, ankle: C },
  "Romanian Deadlift": { lower_back: A, shoulder: C, hip: C },
  "Leg Press": { knee: C, lower_back: C, hip: C },
  "Leg Extension": { knee: A },
  "Leg Curl": { knee: C },
  "Walking Lunge": { knee: A, hip: C, ankle: C },
  "Bulgarian Split Squat": { knee: A, hip: C, ankle: C },
  "Standing Calf Raise": { ankle: C, lower_back: C },
  "Hip Thrust": { hip: C, lower_back: C },
  "Single-Leg Calf Raise": { ankle: C },
  "Step-up": { knee: C, ankle: C },
  "Single-Leg Romanian Deadlift": { lower_back: C, hip: C, ankle: C },
  "Glute Bridge": { hip: C },
  // Shoulders
  "Overhead Press": { shoulder: A, lower_back: C, neck: C, elbow: C, wrist: C },
  "Seated Dumbbell Press": { shoulder: A, elbow: C },
  "Lateral Raise": { shoulder: C },
  "Rear Delt Fly": { shoulder: C, lower_back: C },
  "Face Pull": { shoulder: C },
  // Arms
  "Barbell Curl": { elbow: C, wrist: C },
  "Dumbbell Curl": { elbow: C },
  "Hammer Curl": { elbow: C },
  "Triceps Pushdown": { elbow: C },
  "Skull Crusher": { elbow: A, shoulder: C },
  "Overhead Triceps Extension": { elbow: C, shoulder: A },
  // Core
  Plank: { shoulder: C, elbow: C, lower_back: C },
  "Hanging Leg Raise": { shoulder: A, lower_back: C, elbow: C, wrist: C },
  "Cable Crunch": { lower_back: C, neck: C },
  "Russian Twist": { lower_back: A },
  "Side Plank": { shoulder: C, elbow: C },
  "Bird Dog": { wrist: C },
  // Timed sessions
  Burpee: { shoulder: A, wrist: C, knee: C, ankle: C, lower_back: C },
  "Bodyweight Squat": { knee: C },
  "Jump Squat": { knee: A, ankle: A, hip: C, lower_back: C },
  "Mountain Climber": { wrist: C, shoulder: C, hip: C },
  "Jumping Jack": { knee: C, ankle: C, shoulder: C },
  "High Knees": { knee: C, ankle: C, hip: C },
  "Reverse Lunge": { knee: C, hip: C },
  "Jumping Lunge": { knee: A, ankle: A, hip: C },
  "Skater Jump": { knee: A, ankle: A, hip: C },
  "Wall Sit": { knee: C },
  Inchworm: { wrist: C, shoulder: C, lower_back: C },
  "Plank Shoulder Tap": { shoulder: C, wrist: C },
  "Bicycle Crunch": { neck: C, lower_back: C },
  "Flutter Kicks": { lower_back: C, hip: C },
  Crunch: { neck: C },
  "Lying Leg Raise": { lower_back: C, hip: C },
  "Hollow Hold": { lower_back: C },
  "Goblet Squat": { knee: C, lower_back: C },
  "Dumbbell Thruster": { shoulder: A, knee: C, lower_back: C, wrist: C },
  "Dumbbell Swing": { lower_back: A, shoulder: C },
  "Renegade Row": { wrist: C, shoulder: C, lower_back: C },
  "Dumbbell Romanian Deadlift": { lower_back: A, hip: C },
  "Dumbbell Reverse Lunge": { knee: C, hip: C },
  "Dumbbell Sumo Squat": { knee: C, hip: C },
  "Dumbbell Push Press": { shoulder: A, lower_back: C, wrist: C },
  "Dumbbell Woodchop": { lower_back: C, shoulder: C },
};

export interface InjuryWarning {
  level: InjuryLevel;
  /** The injured areas the exercise loads at that level. */
  areas: PainArea[];
}

/**
 * The warning for an exercise, given the athlete's injuries: "avoid" if it is
 * to be avoided for any of them, else "caution", else none. Custom exercises
 * have no rules, so no warning: the athlete knows what they made.
 */
export function injuryWarning(exerciseName: string | undefined, injuries: Pick<Injury, "area">[]): InjuryWarning | null {
  if (!exerciseName || !injuries.length) return null;
  const rules = INJURY_RULES[exerciseName];
  if (!rules) return null;
  const hit = (level: InjuryLevel) => injuries.map((i) => i.area).filter((a) => rules[a] === level);
  const avoid = hit("avoid");
  if (avoid.length) return { level: "avoid", areas: avoid };
  const caution = hit("caution");
  return caution.length ? { level: "caution", areas: caution } : null;
}

/** Whether an exercise is fine to propose, in a generator or as a replacement. */
export const isAvoided = (exerciseName: string | undefined, injuries: Pick<Injury, "area">[]) =>
  injuryWarning(exerciseName, injuries)?.level === "avoid";

/** Rank exercises for a replacement: safe first, then "caution", then "avoid". */
export function bySafety<E extends { name: string }>(list: E[], injuries: Pick<Injury, "area">[]): E[] {
  const rank = (e: E) => ({ none: 0, caution: 1, avoid: 2 })[injuryWarning(e.name, injuries)?.level ?? "none"];
  return [...list].sort((a, b) => rank(a) - rank(b));
}

/** Add or remove an area from the injuries, keeping the date of those kept. */
export function toggleInjury(injuries: Injury[], area: PainArea, today: string): Injury[] {
  return injuries.some((i) => i.area === area) ? injuries.filter((i) => i.area !== area) : [...injuries, { area, since: today }];
}

import type { StrengthGoal } from "@/lib/goals";
import { unspecifiedGroup } from "@/lib/muscles";
import type { IntervalPlan } from "@/lib/intervals";
import type { Injury } from "@/lib/injuries";
import type { RunPaces } from "@/lib/runPaces";
import type { MealPrefs } from "@/lib/mealCatalog";
import Dexie, { type EntityTable } from "dexie";

// ─── Sync metadata mixin ─────────────────────────────────────────────
// Every syncable record carries these fields.
// `_dirty` = 1 means "needs sync to server", 0 = "synced".
// `deletedAt` = soft-delete timestamp (null = active).

export interface SyncFields {
  uuid: string;
  userId?: string | null;
  syncedAt?: string | null;
  deletedAt?: string | null;
  _dirty: number; // 0 | 1
}

// ─── Domain enums ────────────────────────────────────────────────────

export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type Sex = "male" | "female" | "other" | "undisclosed";
export type TrainingGoal =
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "fat_loss"
  | "general_fitness";
/** A muscle group: an id of the list the admin keeps (app settings "muscle_groups", migration 091). */
export type MuscleGroup = string;
/** The muscles drawn on the body map, finer than the groups (migration 086); each belongs to one group. */
/** A muscle of the body map: an id of the list the admin keeps (app settings "body_muscles"). */
export type Muscle = string;
export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "bands"
  | "pullup_bar"
  | "suspension"
  | "other";

// ─── Entity interfaces ───────────────────────────────────────────────

/** A program's session moved from its day to another (null: skipped). */
export interface ScheduleMove {
  /** The program's uuid. */
  program: string;
  from: string;
  to: string | null;
}

export interface AthleteProfile extends SyncFields {
  id?: number;
  goals: TrainingGoal[];
  fitnessLevel: FitnessLevel;
  injuries?: string;
  sex?: Sex;
  heightCm?: number;
  birthDate?: string;
  equipment: Equipment[];
  /** Days planned for training, 1 = Monday … 7 = Sunday. */
  trainingDays?: number[];
  /** Usual training time, "18:30", for the calendar reminders. */
  trainingTime?: string;
  /** Lifts to reach, see lib/goals. */
  strengthGoals?: StrengthGoal[];
  /** Monday of the week chosen as a deload, see lib/deload. */
  deloadWeek?: string | null;
  /** Injuries in progress: the exercises loading these areas are flagged. */
  injuryAreas?: Injury[] | null;
  /** Sessions moved to another day, see lib/schedule. */
  scheduleMoves?: ScheduleMove[] | null;
  /** Running paces: the VMA and where it came from, see lib/runPaces. */
  runPaces?: RunPaces | null;
  /** Functional threshold power, in watts: the power zones and the ride load come from it (migration 071). */
  ftpW?: number | null;
  /** The days and minutes one can train this week (its Monday): the assistant fits the week to it (migration 073). */
  weekAvailability?: { monday: string; days: { weekday: number; minutes: number }[] } | null;
  /** The favourite sport, kept with the profile so it follows the athlete: a sport, "all" or "none"; null if never chosen (migration 074). */
  favoriteSport?: string | null;
  /** The sport practised alongside (migration 074). */
  secondSport?: string | null;
  /** Muscles, movements or exercises ruled out (migration 076). */
  restrictions?: Restriction[] | null;
  /** One's plan B, read by lib/planB ({"kind": "none"} when chosen to have none; migration 081). */
  planB?: unknown;
  /** How much of the app one sees, read by lib/displayMode; null when never chosen (migration 082). */
  displayMode?: string | null;
  /** Diet, foods left out and meals a day, for the meal ideas, see lib/mealCatalog. */
  mealPrefs?: MealPrefs | null;
  /** Optional daily macro targets */
  nutritionTargets?: { calories?: number; protein?: number; carbs?: number; fat?: number; water?: number };
  /** GDPR Art. 9 explicit consent to process health/fitness data */
  consentHealthData: boolean;
  consentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadinessCheckin extends SyncFields {
  id?: number;
  date: string;
  mood?: number; // 1..5
  energy?: number; // 1..5
  sleep?: number; // sleep quality 1..5
  soreness?: number; // 1..5 (higher = more sore)
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutNote extends SyncFields {
  id?: number;
  workoutId: number;
  authorName?: string;
  body: string;
  /** Optional anchor to a specific exercise within the workout (stable uuid). */
  exerciseUuid?: string;
  exerciseName?: string;
  /** Storage path of an attached voice note, if any. */
  audioPath?: string;
  /** A pain reported on the exercise: where, and how much from 1 to 10. */
  painArea?: string | null;
  painLevel?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface NutritionEntry extends SyncFields {
  id?: number;
  date: string;
  meal?: Meal;
  name: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  createdAt: string;
  updatedAt: string;
}

export type ExerciseLevel = "beginner" | "intermediate" | "advanced";
/** What an exercise asks of the body; one exercise may ask several (migration 076). */
export type Movement =
  | "squat" | "hinge" | "lunge"
  | "push_horizontal" | "push_vertical" | "pull_horizontal" | "pull_vertical"
  | "overhead" | "hanging" | "isolation"
  | "core_flexion" | "core_stability" | "rotation"
  | "jump" | "conditioning" | "mobility";
export type LocalizedList = Partial<Record<"fr" | "en" | "de", string[]>>;

/**
 * Something the athlete rules out besides an injured joint: a muscle group, a
 * movement or an exercise (its uuid), to avoid or to do with caution, maybe
 * until a date (migration 076).
 */
export interface Restriction {
  kind: "muscle" | "movement" | "exercise";
  value: string;
  level: "avoid" | "caution";
  /** YYYY-MM-DD, the last day it applies. */
  until?: string | null;
}

export interface Exercise extends SyncFields {
  id?: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: Equipment;
  description?: string;
  videoUrl?: string;
  /** Translations an admin can edit; the English name stays the key. */
  nameFr?: string | null;
  nameDe?: string | null;
  descriptionFr?: string | null;
  descriptionDe?: string | null;
  /** The areas it loads when injured ("avoid" / "caution"), edited by an admin; none for a custom one. */
  injuryRules?: Partial<Record<"shoulder" | "elbow" | "wrist" | "neck" | "upper_back" | "lower_back" | "hip" | "knee" | "ankle", "avoid" | "caution">> | null;
  /** beginner / intermediate / advanced (migration 076). */
  level?: ExerciseLevel | null;
  /** What it asks of the body: squat, hinge, push, overhead, jumps... (migration 076). */
  movements?: Movement[] | null;
  /** The muscle groups it works besides its main one (migration 076). */
  secondaryMuscles?: MuscleGroup[] | null;
  /** The muscles it works mainly, and those it works too (migration 086); none for a custom one. */
  targetMuscles?: Muscle[] | null;
  assistMuscles?: Muscle[] | null;
  /** Key points and usual faults, by language, filled by an admin (migration 076). */
  cues?: LocalizedList | null;
  mistakes?: LocalizedList | null;
  /** The exercise it is a variant of (its uuid) (migration 076). */
  variantOf?: string | null;
  /** For group lessons (migration 092): its sport and theme there, its suggested minutes, the ages it suits and the kit it needs. */
  sport?: string | null;
  theme?: string | null;
  minutes?: number | null;
  ages?: string[] | null;
  gear?: string[] | null;
  /** true = user-created custom exercise; false = seeded library row */
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One exercise slot inside a program day (stored as JSONB). */
export interface ProgramExercise {
  exerciseName: string;
  exerciseUuid?: string;
  targetSets: number;
  targetReps: string; // e.g. "8-12"
  restSec?: number;
  /** Done straight after this one, without rest: a superset. */
  supersetWithNext?: boolean;
  /** Load as a share of the estimated 1RM, one per set (the last one repeats). */
  percents?: number[];
}

export type Sport = "run" | "swim" | "bike" | "row" | "hike" | "vaulting" | "other";

/** What an endurance day asks for, instead of a list of exercises. */
export interface CardioTarget {
  sport: Sport;
  distanceKm?: number;
  durationMin?: number;
  intensity?: string;
  notes?: string;
  /** Why the session matters, in one sentence. */
  purpose?: string;
  /** Ordered steps: warm-up, main set, cool-down. */
  steps?: string[];
  /** The techniques the session uses (keys of the swim technique sheets), shown as links. */
  techniques?: string[];
  /** A guided indoor-cycling session: the blocks the timer plays one by one. */
  blocks?: SpinBlock[];
}

/** One block of an indoor-cycling session: how, how long, how fast, how hard. */
export interface SpinBlock {
  kind: SpinKind;
  sec: number;
  /** Cadence, revolutions per minute: [from, to]. */
  rpm: [number, number];
  /** Resistance, 1 (none) to 10 (hardly turns). */
  resistance: number;
}

export type SpinKind = "warmup" | "seated" | "fast" | "climb" | "standing" | "sprint" | "recovery" | "cooldown";

export interface ProgramDay {
  /** Stays with the day through renames and moves: what a session started from it points to. */
  key?: string;
  name: string; // e.g. "Push", "Pull", "Legs"
  exercises: ProgramExercise[];
  /** Set on plans whose days follow each other week after week. */
  week?: number;
  cardio?: CardioTarget;
}

/** A warm-up or stretching session, as kept with its workout. */
export interface MobilityLog {
  mode: "warmup" | "stretch" | "yoga" | "taichi";
  /** The length chosen, in minutes. */
  minutes: number;
  target: "session" | "full" | "upper" | "lower";
  /** The keys of the moves done (app_settings.mobility_moves). */
  moves: string[];
  /** How supple one felt after it, 1 (stiff) to 5 (very supple). */
  rating?: number | null;
}

/** A program as it was before a change. */
export interface ProgramRevision {
  at: string;
  name: string;
  structure: ProgramDay[];
}

export interface Program extends SyncFields {
  id?: number;
  name: string;
  description?: string;
  /** Owner (creator) auth user id — usually a trainer. */
  ownerUserId?: string | null;
  /** Auth user id of the client this program is assigned to (optional). */
  assignedToUserId?: string | null;
  /** Team/group UUID this program belongs to (optional, plain uuid string). */
  groupId?: string | null;
  /** First day of the program (YYYY-MM-DD): a plan in weeks follows the calendar from it. */
  startDate?: string | null;
  /** Days of the week it is trained on (1 = Monday … 7 = Sunday): it is then in the planning. */
  weekdays?: number[] | null;
  structure: ProgramDay[];
  /** Kept at the top of one's programs (migration 067). */
  favorite?: boolean | null;
  /** Put away: out of the planning and the session picker, kept with its history (migration 067). */
  archivedAt?: string | null;
  /** The versions it had before its last changes, newest last (migration 068). */
  revisions?: ProgramRevision[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workout extends SyncFields {
  id?: number;
  date: string;
  programId?: number | null;
  /** Which day of the program this workout was started from. */
  programDayIndex?: number | null;
  /** That day as the program had it when the session started: the plan, kept whatever the program becomes (migration 068). */
  plannedDay?: ProgramDay | null;
  /** How hard the whole session felt, 1-10 (session RPE, Foster's CR-10), given at the end (migration 069). */
  sessionRpe?: number | null;
  /** How it went, 1 (badly) to 5 (great) (migration 069). */
  feeling?: number | null;
  /** Called off before anything was done: kept in the history, counted nowhere, its day still to do (migration 069). */
  cancelledAt?: string | null;
  /** A warm-up or a stretch: what was done and how supple one felt (migration 070). */
  mobility?: MobilityLog | null;
  /** A timed (HIIT) session: the rounds carried out to the end (migration 072). */
  roundsDone?: number | null;
  /** Absent on older workouts, which are all strength sessions. A warm-up or a stretch is "mobility". */
  kind?: "strength" | "cardio" | "interval" | "mobility";
  sport?: Sport | null;
  /** A timed session: what it was built from (focus, dumbbells, rhythm, minutes). */
  intervalPlan?: IntervalPlan | null;
  distanceM?: number | null;
  durationSec?: number | null;
  /** Metres climbed (D+), from a GPS track or typed: the measure of a hike. */
  elevationGainM?: number | null;
  title?: string;
  notes?: string;
  durationMin?: number;
  /** Average / peak heart rate captured via Web Bluetooth during the session. */
  avgHr?: number;
  maxHr?: number;
  /** Steps a minute on foot, turns a minute on a bike (migration 071). */
  avgCadence?: number | null;
  /** Watts, from a power meter (migration 071). */
  avgPowerW?: number | null;
  maxPowerW?: number | null;
  /** The steady power the ride's ups and downs cost, from a watch file (migration 077). */
  normalizedPowerW?: number | null;
  /** Where it came from: typed ("manual", or none), a watch "file", later a connected service (migration 078). */
  source?: "manual" | "file" | "strava" | "garmin" | "health" | null;
  /** The service's own id of the activity, for a connected service (migration 078). */
  externalId?: string | null;
  /** When the activity started, as the file says (ISO) (migration 078). */
  startedAt?: string | null;
  /** When "Finish the session" was tapped (ISO): the session is then locked until reopened (migration 087). */
  finishedAt?: string | null;
  /** The program's reps and holds made harder or easier for this session, in percent (migration 087). */
  intensityPct?: number | null;
  /** SHA-256 of the file it was imported from (migration 078). */
  fileHash?: string | null;
  /** A swim: the stroke, the pool length (0 in open water) and the strokes per length (migration 071). */
  swimStroke?: "free" | "breast" | "back" | "fly" | "mixed" | null;
  poolLengthM?: number | null;
  strokesPerLength?: number | null;
  /** When it started, "HH:MM" local time (migration 074). */
  startTime?: string | null;
  /** Its goal in a sentence, e.g. "threshold work" (migration 074). */
  sessionGoal?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSet extends SyncFields {
  id?: number;
  workoutId: number;
  exerciseId: number;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  rpe?: number;
  restSec?: number;
  completed: boolean;
  /** A ramp-up set: never counted in volume, records or last performance. */
  isWarmup?: boolean;
  /** Exercises of a session sharing this number are done in a row. */
  supersetGroup?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BodyMetric extends SyncFields {
  id?: number;
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  /** Free-form measurements, e.g. { waist: 80, biceps: 38 } in cm */
  measurements?: Record<string, number>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** One per (user, date): total water intake in millilitres. */
export interface HydrationLog extends SyncFields {
  id?: number;
  date: string;
  ml: number;
  createdAt: string;
  updatedAt: string;
}

/** One per (user, date): daily health metrics from a wearable or manual entry. */
export interface HealthMetric extends SyncFields {
  id?: number;
  date: string;
  steps?: number;
  restingHr?: number;
  hrv?: number;
  sleepHours?: number;
  vo2max?: number;
  /** Where the data came from: "manual" | "import" | device name. */
  source?: string;
  createdAt: string;
  updatedAt: string;
}

/** A direct message. user_id = sender; recipientId = the other party. */
/** A vaulting competition: the scores of each test, out of 10, and the ranking. */
export interface CompetitionResult extends SyncFields {
  id?: number;
  date: string;
  event: string;
  category?: string | null;
  horse?: string | null;
  compulsory?: number | null;
  technical?: number | null;
  freestyle?: number | null;
  rank?: number | null;
  participants?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A horse one lunges or rides, with how much work it may take in a week. */
export interface Horse extends SyncFields {
  id?: number;
  name: string;
  /** Minutes of work a week (walk, trot and canter) before the alert. */
  weeklyLimitMin?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The work a session put on a horse, in minutes at each gait. */
/** What a goal measures (migration 075). */
export type GoalType = "strength" | "time" | "distance" | "frequency" | "weight";

/**
 * A goal: a target value on one measure, maybe by a date. Its progress is
 * computed from the sessions and the weigh-ins, never stored (migration 075).
 */
export interface Goal extends SyncFields {
  id?: number;
  type: GoalType;
  /** The sport (time, distance), or what is counted (frequency: "all", "strength", "mobility" or a sport). */
  scope?: string | null;
  /** A strength goal's exercise: its synced id, the name as a fallback. */
  exerciseUuid?: string | null;
  exerciseName?: string | null;
  /** A time goal's distance, in metres. */
  distanceM?: number | null;
  /** kg (strength, weight), seconds (time), metres (distance), sessions a week (frequency). */
  targetValue: number;
  /** Where it started: the best 1RM, the best time or the weight when it was set. */
  startValue?: number | null;
  /** YYYY-MM-DD */
  deadline?: string | null;
  /** 1: the main goal, shown on the home screen; 2: the others. */
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface HorseSession extends SyncFields {
  id?: number;
  horseId: number;
  date: string;
  walkMin: number;
  trotMin: number;
  canterMin: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** When a lesson group trains in the week: ISO day (1 Monday … 7 Sunday), "HH:MM", minutes (migration 088). */
export interface LessonSlot {
  day: number;
  time: string;
  minutes: number;
}

/**
 * A coach's lesson group: a team without accounts, kept with the teams (kind
 * "lessons", migrations 089 and 092), in a sport of the reference (tennis,
 * vaulting). Never its players, only its age band and how many play.
 */
export interface LessonGroup extends SyncFields {
  id?: number;
  kind: "lessons";
  /** A sport of the lessons' reference (app settings "group_lessons"). */
  sport: string;
  name: string;
  /** Notes on the group (the team's description). */
  description?: string | null;
  ageBand?: string | null;
  level?: string | null;
  slots: LessonSlot[];
  players?: number | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An exercise in a lesson, as it was planned: kept readable if the exercise goes. */
export interface LessonPlanItem {
  /** The exercise's uuid, when it came from the library. */
  drill?: string | null;
  name: string;
  /** Its theme in the lesson; none for an exercise not made for lessons. */
  category?: string | null;
  minutes: number;
}

/** A lesson of a group on a day: planned, then given (migrations 088, 092). */
export interface GroupLesson extends SyncFields {
  id?: number;
  groupId: number;
  date: string;
  theme?: string | null;
  plan: LessonPlanItem[];
  /** When it was marked given (ISO); null while planned. */
  givenAt?: string | null;
  present?: number | null;
  /** How hard it was for the group, 1 (easy) to 5 (very hard). */
  intensity?: number | null;
  notes?: string | null;
  /** On a horse (vaulting): which one, and the work logged on it for this lesson. */
  horseId?: number | null;
  horseSessionId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message extends SyncFields {
  id?: number;
  recipientId: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Local-only tables ────────────────────────────────────────────────

export interface FormDraft {
  id?: number;
  formKey: string;
  data: string;
  updatedAt: string;
}

export interface SyncMeta {
  tableName: string;
  lastPullAt?: string;
}

export interface AuthMeta {
  key: string; // "currentUser"
  userId?: string;
  email?: string;
  sessionToken?: string;
  /** The licence's features last seen online, for offline use (the server checks writes). */
  planFeatures?: string[];
  isAdmin?: boolean;
}

// ─── Database definition ──────────────────────────────────────────────

const db = new Dexie("TrainTrack") as Dexie & {
  athleteProfiles: EntityTable<AthleteProfile, "id">;
  exercises: EntityTable<Exercise, "id">;
  programs: EntityTable<Program, "id">;
  workouts: EntityTable<Workout, "id">;
  workoutSets: EntityTable<WorkoutSet, "id">;
  bodyMetrics: EntityTable<BodyMetric, "id">;
  readinessCheckins: EntityTable<ReadinessCheckin, "id">;
  nutritionEntries: EntityTable<NutritionEntry, "id">;
  workoutNotes: EntityTable<WorkoutNote, "id">;
  hydrationLogs: EntityTable<HydrationLog, "id">;
  messages: EntityTable<Message, "id">;
  healthMetrics: EntityTable<HealthMetric, "id">;
  competitionResults: EntityTable<CompetitionResult, "id">;
  horses: EntityTable<Horse, "id">;
  horseSessions: EntityTable<HorseSession, "id">;
  lessonGroups: EntityTable<LessonGroup, "id">;
  groupLessons: EntityTable<GroupLesson, "id">;
  goals: EntityTable<Goal, "id">;
  formDrafts: EntityTable<FormDraft, "id">;
  syncMeta: EntityTable<SyncMeta, "tableName">;
  authMeta: EntityTable<AuthMeta, "key">;
};

db.version(1).stores({
  athleteProfiles: "++id, uuid, _dirty",
  exercises: "++id, name, muscleGroup, isCustom, uuid, _dirty",
  programs: "++id, assignedToUserId, groupId, uuid, _dirty",
  workouts: "++id, date, programId, uuid, _dirty",
  workoutSets: "++id, workoutId, exerciseId, uuid, _dirty",
  bodyMetrics: "++id, date, uuid, _dirty",
  formDrafts: "++id, &formKey, updatedAt",
  syncMeta: "tableName",
  authMeta: "&key",
});

db.version(2).stores({
  athleteProfiles: "++id, uuid, _dirty",
  exercises: "++id, name, muscleGroup, isCustom, uuid, _dirty",
  programs: "++id, assignedToUserId, groupId, uuid, _dirty",
  workouts: "++id, date, programId, uuid, _dirty",
  workoutSets: "++id, workoutId, exerciseId, uuid, _dirty",
  bodyMetrics: "++id, date, uuid, _dirty",
  readinessCheckins: "++id, date, uuid, _dirty",
  nutritionEntries: "++id, date, uuid, _dirty",
  formDrafts: "++id, &formKey, updatedAt",
  syncMeta: "tableName",
  authMeta: "&key",
});

db.version(3).stores({
  athleteProfiles: "++id, uuid, _dirty",
  exercises: "++id, name, muscleGroup, isCustom, uuid, _dirty",
  programs: "++id, assignedToUserId, groupId, uuid, _dirty",
  workouts: "++id, date, programId, uuid, _dirty",
  workoutSets: "++id, workoutId, exerciseId, uuid, _dirty",
  bodyMetrics: "++id, date, uuid, _dirty",
  readinessCheckins: "++id, date, uuid, _dirty",
  nutritionEntries: "++id, date, uuid, _dirty",
  workoutNotes: "++id, workoutId, uuid, _dirty",
  formDrafts: "++id, &formKey, updatedAt",
  syncMeta: "tableName",
  authMeta: "&key",
});

db.version(4).stores({
  athleteProfiles: "++id, uuid, _dirty",
  exercises: "++id, name, muscleGroup, isCustom, uuid, _dirty",
  programs: "++id, assignedToUserId, groupId, uuid, _dirty",
  workouts: "++id, date, programId, uuid, _dirty",
  workoutSets: "++id, workoutId, exerciseId, uuid, _dirty",
  bodyMetrics: "++id, date, uuid, _dirty",
  readinessCheckins: "++id, date, uuid, _dirty",
  nutritionEntries: "++id, date, uuid, _dirty",
  workoutNotes: "++id, workoutId, uuid, _dirty",
  hydrationLogs: "++id, date, uuid, _dirty",
  formDrafts: "++id, &formKey, updatedAt",
  syncMeta: "tableName",
  authMeta: "&key",
});

db.version(5).stores({
  athleteProfiles: "++id, uuid, _dirty",
  exercises: "++id, name, muscleGroup, isCustom, uuid, _dirty",
  programs: "++id, assignedToUserId, groupId, uuid, _dirty",
  workouts: "++id, date, programId, uuid, _dirty",
  workoutSets: "++id, workoutId, exerciseId, uuid, _dirty",
  bodyMetrics: "++id, date, uuid, _dirty",
  readinessCheckins: "++id, date, uuid, _dirty",
  nutritionEntries: "++id, date, uuid, _dirty",
  workoutNotes: "++id, workoutId, uuid, _dirty",
  hydrationLogs: "++id, date, uuid, _dirty",
  messages: "++id, recipientId, uuid, _dirty",
  formDrafts: "++id, &formKey, updatedAt",
  syncMeta: "tableName",
  authMeta: "&key",
});

db.version(6).stores({
  athleteProfiles: "++id, uuid, _dirty",
  exercises: "++id, name, muscleGroup, isCustom, uuid, _dirty",
  programs: "++id, assignedToUserId, groupId, uuid, _dirty",
  workouts: "++id, date, programId, uuid, _dirty",
  workoutSets: "++id, workoutId, exerciseId, uuid, _dirty",
  bodyMetrics: "++id, date, uuid, _dirty",
  readinessCheckins: "++id, date, uuid, _dirty",
  nutritionEntries: "++id, date, uuid, _dirty",
  workoutNotes: "++id, workoutId, uuid, _dirty",
  hydrationLogs: "++id, date, uuid, _dirty",
  messages: "++id, recipientId, uuid, _dirty",
  healthMetrics: "++id, date, uuid, _dirty",
  formDrafts: "++id, &formKey, updatedAt",
  syncMeta: "tableName",
  authMeta: "&key",
});

// v7: vaulting competition results.
db.version(7).stores({
  competitionResults: "++id, date, uuid, _dirty",
});

// v8: horses and the work put on them.
db.version(8).stores({
  horses: "++id, uuid, _dirty",
  horseSessions: "++id, horseId, date, uuid, _dirty",
});

// v9: goals of every kind (migration 075).
db.version(9).stores({
  goals: "++id, uuid, _dirty, userId",
});

// v10: rows read by their owner without scanning the whole table, and a
// session found by the file it came from (migration 078).
db.version(10).stores({
  workouts: "++id, date, programId, uuid, _dirty, userId, [userId+date], fileHash",
  workoutSets: "++id, workoutId, exerciseId, uuid, _dirty, userId",
  bodyMetrics: "++id, date, uuid, _dirty, userId",
  readinessCheckins: "++id, date, uuid, _dirty, userId",
  healthMetrics: "++id, date, uuid, _dirty, userId",
  nutritionEntries: "++id, date, uuid, _dirty, userId",
});

// v11: a tennis coach's groups, drills and lessons (migration 088).
db.version(11).stores({
  tennisGroups: "++id, uuid, _dirty, userId",
  tennisDrills: "++id, uuid, _dirty, userId",
  tennisLessons: "++id, groupId, date, uuid, _dirty, userId",
});

// v12: the tennis notebook becomes the group lessons' (migration 092): its
// groups and lessons move to tables of their own name, its drills become
// exercises of the library (one's own drills, one's own exercises).
db.version(12)
  .stores({
    lessonGroups: "++id, uuid, _dirty, userId",
    groupLessons: "++id, groupId, date, uuid, _dirty, userId",
    tennisGroups: null,
    tennisDrills: null,
    tennisLessons: null,
  })
  .upgrade(async (tx) => {
    const ids = new Map<number, number>();
    for (const g of await tx.table("tennisGroups").toArray()) {
      const { id, ...rest } = g;
      ids.set(id, (await tx.table("lessonGroups").add({ ...rest, kind: "lessons", sport: rest.sport ?? "tennis" })) as number);
    }
    for (const l of await tx.table("tennisLessons").toArray()) {
      const { id, ...rest } = l;
      void id;
      await tx.table("groupLessons").add({ ...rest, groupId: ids.get(l.groupId) ?? l.groupId });
    }
    // One's own drills, which only this device may hold: one's own exercises.
    for (const d of await tx.table("tennisDrills").toArray()) {
      if (!d.userId) continue;
      const { id, category, equipment, ...rest } = d;
      void id;
      await tx.table("exercises").add({ ...rest, muscleGroup: unspecifiedGroup() ?? "", isCustom: true, sport: "tennis", theme: category, gear: equipment });
    }
  });

export { db };

// ─── Helper: get current user ID from cached auth ─────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  const meta = await db.authMeta.get("currentUser");
  return meta?.userId ?? null;
}

export function getCurrentUserIdSync(): string | null {
  return _cachedUserId;
}

let _cachedUserId: string | null = null;

export async function refreshCachedUserId(): Promise<void> {
  const meta = await db.authMeta.get("currentUser");
  _cachedUserId = meta?.userId ?? null;
}

// Initialize on module load (async, non-blocking)
if (typeof window !== "undefined") {
  db.on("ready", () => {
    refreshCachedUserId();
  });
}

export default db;

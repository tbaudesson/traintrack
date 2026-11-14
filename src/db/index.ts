import type { StrengthGoal } from "@/lib/goals";
import type { IntervalPlan } from "@/lib/intervals";
import type { Injury } from "@/lib/injuries";
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
export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "full_body"
  | "other";
export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "bands"
  | "other";

// ─── Entity interfaces ───────────────────────────────────────────────

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

export type Sport = "run" | "swim" | "bike" | "row" | "vaulting" | "other";

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
  name: string; // e.g. "Push", "Pull", "Legs"
  exercises: ProgramExercise[];
  /** Set on plans whose days follow each other week after week. */
  week?: number;
  cardio?: CardioTarget;
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
  createdAt: string;
  updatedAt: string;
}

export interface Workout extends SyncFields {
  id?: number;
  date: string;
  programId?: number | null;
  /** Which day of the program this workout was started from. */
  programDayIndex?: number | null;
  /** Absent on older workouts, which are all strength sessions. */
  kind?: "strength" | "cardio" | "interval";
  sport?: Sport | null;
  /** A timed session: what it was built from (focus, dumbbells, rhythm, minutes). */
  intervalPlan?: IntervalPlan | null;
  distanceM?: number | null;
  durationSec?: number | null;
  title?: string;
  notes?: string;
  durationMin?: number;
  /** Average / peak heart rate captured via Web Bluetooth during the session. */
  avgHr?: number;
  maxHr?: number;
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

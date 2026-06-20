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
  /** GDPR Art. 9 explicit consent to process health/fitness data */
  consentHealthData: boolean;
  consentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise extends SyncFields {
  id?: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: Equipment;
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
}

export interface ProgramDay {
  name: string; // e.g. "Push", "Pull", "Legs"
  exercises: ProgramExercise[];
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
  structure: ProgramDay[];
  createdAt: string;
  updatedAt: string;
}

export interface Workout extends SyncFields {
  id?: number;
  date: string;
  programId?: number | null;
  title?: string;
  notes?: string;
  durationMin?: number;
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

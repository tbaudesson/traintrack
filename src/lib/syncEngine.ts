/**
 * Bidirectional sync engine: Dexie (IndexedDB) ↔ Supabase (PostgreSQL)
 *
 * Strategy:
 * - Push: dirty Dexie records → upsert into Supabase
 * - Pull: Supabase records updated after lastPullAt → upsert into Dexie
 * - LWW (Last-Write-Wins) via updatedAt / createdAt timestamps
 * - Realtime: subscribe to postgres_changes for live sync
 * - Auto-push 500ms after local mutation, periodic pull every 5 min
 */

import { supabase } from "./supabase";
import { db, getCurrentUserId } from "@/db";
import type { SyncMeta } from "@/db";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────

export type SyncState = "idle" | "syncing" | "error" | "offline";

type SyncListener = (state: SyncState, error?: string) => void;

interface TableSyncConfig {
  /** Dexie table name (camelCase) */
  dexieTable: string;
  /** Supabase table name (snake_case) */
  supabaseTable: string;
  /** FK fields: dexie field → { parentDexieTable, supabaseColumn } */
  fkMappings?: Record<string, { parentDexieTable: string; supabaseColumn: string }>;
  /** Fields stored as JSONB in Supabase (arrays/objects) */
  jsonFields?: string[];
  /** Dexie fields to skip when pushing (e.g. photoBlob, photos, local-only) */
  skipFields?: string[];
  /** Whether this table has an updatedAt field (for LWW) */
  hasUpdatedAt: boolean;
  /**
   * If true, do NOT filter the pull by user_id — let RLS decide which rows the
   * caller may read. Covers two cases: trainer-visible client data
   * (is_my_client) and globally-readable rows (e.g. seeded exercises with
   * user_id = null).
   */
  trainerVisible?: boolean;
}

// ─── Table configuration ──────────────────────────────────────────────

const TABLE_CONFIGS: TableSyncConfig[] = [
  {
    dexieTable: "athleteProfiles",
    supabaseTable: "athlete_profiles",
    jsonFields: ["goals", "equipment", "nutritionTargets"],
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    // Seeded library rows have user_id = null and must be pulled for everyone;
    // trainerVisible skips the user_id filter so RLS returns globals + own customs.
    dexieTable: "exercises",
    supabaseTable: "exercises",
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    // ownerUserId / assignedToUserId / groupId are plain UUID strings
    // (groups are managed via RPCs, not Dexie-synced), so no fkMappings.
    dexieTable: "programs",
    supabaseTable: "programs",
    jsonFields: ["structure"],
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    dexieTable: "workouts",
    supabaseTable: "workouts",
    fkMappings: {
      programId: { parentDexieTable: "programs", supabaseColumn: "program_id" },
    },
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    dexieTable: "workoutSets",
    supabaseTable: "workout_sets",
    fkMappings: {
      workoutId: { parentDexieTable: "workouts", supabaseColumn: "workout_id" },
      exerciseId: { parentDexieTable: "exercises", supabaseColumn: "exercise_id" },
    },
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    dexieTable: "bodyMetrics",
    supabaseTable: "body_metrics",
    jsonFields: ["measurements"],
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    dexieTable: "readinessCheckins",
    supabaseTable: "readiness_checkins",
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    dexieTable: "nutritionEntries",
    supabaseTable: "nutrition_entries",
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    dexieTable: "workoutNotes",
    supabaseTable: "workout_notes",
    fkMappings: {
      workoutId: { parentDexieTable: "workouts", supabaseColumn: "workout_id" },
    },
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    dexieTable: "hydrationLogs",
    supabaseTable: "hydration_logs",
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    // recipientId is a plain UUID (no FK mapping). trainerVisible skips the
    // user_id filter so RLS returns messages where I'm sender OR recipient.
    dexieTable: "messages",
    supabaseTable: "messages",
    hasUpdatedAt: true,
    trainerVisible: true,
  },
  {
    dexieTable: "healthMetrics",
    supabaseTable: "health_metrics",
    hasUpdatedAt: true,
    trainerVisible: true,
  },
];

// Sync order: parents first, then children
const SYNC_ORDER = [
  "athleteProfiles",
  "exercises",
  "programs",
  "workouts",
  "workoutSets",
  "bodyMetrics",
  "readinessCheckins",
  "nutritionEntries",
  "workoutNotes",
  "hydrationLogs",
  "messages",
  "healthMetrics",
];

// ─── Retry with exponential backoff ───────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 500
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts - 1) throw err;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("withRetry: unreachable");
}

// ─── Helpers: camelCase ↔ snake_case ──────────────────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ─── UUID ↔ local ID resolution ──────────────────────────────────────

/**
 * Build a map of local integer IDs → UUIDs for a given Dexie table.
 * Used during push to resolve FK references.
 */
async function buildIdToUuidMap(
  dexieTableName: string
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const records = await db.table(dexieTableName).toArray();
  for (const r of records) {
    if (r.id != null && r.uuid) {
      map.set(r.id, r.uuid);
    }
  }
  return map;
}

/**
 * Build a map of UUIDs → local integer IDs for a given Dexie table.
 * Used during pull to resolve FK references from Supabase → Dexie.
 */
async function buildUuidToIdMap(
  dexieTableName: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const records = await db.table(dexieTableName).toArray();
  for (const r of records) {
    if (r.id != null && r.uuid) {
      map.set(r.uuid, r.id);
    }
  }
  return map;
}

// ─── Record conversion: Dexie → Supabase ─────────────────────────────

function dexieToSupabase(
  record: Record<string, unknown>,
  config: TableSyncConfig,
  fkUuidMaps: Map<string, Map<number, string>>,
  userId: string
): Record<string, unknown> | null {
  const row: Record<string, unknown> = {};

  const skipSet = new Set([
    "id",
    "_dirty",
    "syncedAt",
    ...(config.skipFields ?? []),
  ]);

  for (const [key, value] of Object.entries(record)) {
    if (skipSet.has(key)) continue;

    // Handle FK mappings: resolve local ID → UUID
    if (config.fkMappings?.[key]) {
      const mapping = config.fkMappings[key];
      if (value == null) {
        row[mapping.supabaseColumn] = null;
      } else {
        const parentMap = fkUuidMaps.get(mapping.parentDexieTable);
        const uuid = parentMap?.get(value as number);
        if (!uuid) {
          // Parent not synced yet or deleted — skip this record
          console.warn(
            `[Sync] FK resolution failed: ${config.dexieTable}.${key}=${value} → parent ${mapping.parentDexieTable} has no UUID`
          );
          return null;
        }
        row[mapping.supabaseColumn] = uuid;
      }
      continue;
    }

    // uuid → id (Supabase PK)
    if (key === "uuid") {
      row.id = value;
      continue;
    }

    // userId → user_id
    if (key === "userId") {
      row.user_id = userId;
      continue;
    }

    // deletedAt → deleted_at (convert to timestamptz or null)
    if (key === "deletedAt") {
      row.deleted_at = value ? value : null;
      continue;
    }

    // Regular field: camelCase → snake_case
    const snakeKey = toSnakeCase(key);
    row[snakeKey] = value;
  }

  // Ensure user_id is always set
  row.user_id = userId;

  return row;
}

// ─── Record conversion: Supabase → Dexie ─────────────────────────────

function supabaseToDexie(
  row: Record<string, unknown>,
  config: TableSyncConfig,
  fkIdMaps: Map<string, Map<string, number>>
): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};

  const skipSet = new Set(["id", "user_id"]);

  for (const [key, value] of Object.entries(row)) {
    if (skipSet.has(key)) continue;

    // id → uuid
    if (key === "id") continue; // handled below

    // Handle FK reverse mappings: UUID → local ID
    if (config.fkMappings) {
      let fkHandled = false;
      for (const [dexieField, mapping] of Object.entries(config.fkMappings)) {
        if (key === mapping.supabaseColumn) {
          if (value == null) {
            result[dexieField] = value;
          } else {
            const parentMap = fkIdMaps.get(mapping.parentDexieTable);
            const localId = parentMap?.get(value as string);
            if (!localId) {
              // Parent not in local DB — need to pull parent first or skip
              console.warn(
                `[Sync] Reverse FK failed: ${config.supabaseTable}.${key}=${value} → no local ID in ${mapping.parentDexieTable}`
              );
              return null;
            }
            result[dexieField] = localId;
          }
          fkHandled = true;
          break;
        }
      }
      if (fkHandled) continue;
    }

    // deleted_at → deletedAt
    if (key === "deleted_at") {
      result.deletedAt = value;
      continue;
    }

    // Regular field: snake_case → camelCase
    const camelKey = toCamelCase(key);
    result[camelKey] = value;
  }

  // Map Supabase id → Dexie uuid
  result.uuid = row.id;
  result.userId = row.user_id;
  result._dirty = 0;
  result.syncedAt = new Date().toISOString();

  return result;
}

// ─── PUSH: Dexie dirty records → Supabase ─────────────────────────────

async function pushTable(
  config: TableSyncConfig,
  fkUuidMaps: Map<string, Map<number, string>>,
  userId: string
): Promise<number> {
  const dirtyRecords = await db
    .table(config.dexieTable)
    .where("_dirty")
    .equals(1)
    .toArray();

  if (dirtyRecords.length === 0) return 0;

  let pushed = 0;

  for (const record of dirtyRecords) {
    const supabaseRow = dexieToSupabase(record, config, fkUuidMaps, userId);
    if (!supabaseRow) continue;

    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from(config.supabaseTable)
          .upsert(supabaseRow, { onConflict: "id" });

        if (error) throw new Error(error.message);
      });

      // Mark as synced in Dexie
      await db.table(config.dexieTable).update(record.id, {
        _dirty: 0,
        syncedAt: new Date().toISOString(),
      });
      pushed++;
    } catch (err) {
      console.error(`[Sync] Push failed for ${config.dexieTable}:`, err);
    }
  }

  return pushed;
}

// ─── PULL: Supabase changes → Dexie ──────────────────────────────────

async function pullTable(
  config: TableSyncConfig,
  fkIdMaps: Map<string, Map<string, number>>,
  userId: string
): Promise<number> {
  // Get lastPullAt for this table
  const meta = await db.syncMeta.get(config.dexieTable);
  const lastPullAt = meta?.lastPullAt;

  // Build query — fetch records updated after lastPullAt.
  // For trainerVisible tables, omit the user_id filter and let RLS return
  // the caller's own rows plus client/global rows they're allowed to read.
  let query = config.trainerVisible
    ? supabase.from(config.supabaseTable).select("*")
    : supabase.from(config.supabaseTable).select("*").eq("user_id", userId);

  // For tables with updated_at, use it as the delta cursor.
  // Use `gte` (not `gt`) because the cursor is advanced to the newest row we
  // actually received (a server timestamp); re-fetching the boundary row each
  // pull is harmless (upserts are idempotent) and avoids skipping rows that
  // share the cursor's exact timestamp.
  if (config.hasUpdatedAt && lastPullAt) {
    query = query.gte("updated_at", lastPullAt);
  } else if (lastPullAt) {
    // For tables without updated_at, use created_at as fallback
    // This means updates to existing records won't be pulled — acceptable
    // for append-only tables like queens, treatments, harvests
    query = query.gte("created_at", lastPullAt);
  }

  // Also pull soft-deleted records
  // (no filter on deleted_at — we want to know about deletions)

  let data: Record<string, unknown>[];
  try {
    const result = await withRetry(async () => {
      const res = await query.order(
        config.hasUpdatedAt ? "updated_at" : "created_at",
        { ascending: true }
      );
      if (res.error) throw new Error(res.error.message);
      return res.data;
    });
    data = (result ?? []) as Record<string, unknown>[];
  } catch (err) {
    console.error(`[Sync] Pull failed for ${config.supabaseTable}:`, err);
    return 0;
  }

  if (data.length === 0) return 0;

  let pulled = 0;
  // Advance the cursor to the newest server timestamp we actually receive —
  // never to the client clock (which can run ahead of the server and silently
  // skip rows updated in the gap).
  let maxCursor: string | undefined = lastPullAt;

  for (const row of data) {
    const rowTime =
      ((row as Record<string, unknown>).updated_at as string | undefined) ??
      ((row as Record<string, unknown>).created_at as string | undefined);
    if (rowTime && (!maxCursor || rowTime > maxCursor)) maxCursor = rowTime;

    const dexieRecord = supabaseToDexie(
      row as Record<string, unknown>,
      config,
      fkIdMaps
    );
    if (!dexieRecord) continue;

    try {
      // Check if record already exists in Dexie (by uuid)
      const existing = await db
        .table(config.dexieTable)
        .where("uuid")
        .equals(row.id as string)
        .first();

      if (existing) {
        // LWW: only update if remote is newer
        const localTime = existing.updatedAt || existing.createdAt;
        const remoteTime =
          (row as Record<string, unknown>).updated_at ||
          (row as Record<string, unknown>).created_at;

        // If local record is dirty (unsynced local changes), skip pull
        // to avoid overwriting the user's offline edits
        if (existing._dirty === 1) {
          continue;
        }

        if (localTime && remoteTime && localTime > remoteTime) {
          continue; // Local is newer, skip
        }

        // Update existing record — keep local `id`
        await db.table(config.dexieTable).update(existing.id, {
          ...dexieRecord,
          id: existing.id, // preserve local PK
        });
      } else {
        // New record — add to Dexie (auto-increment id)
        const { uuid: _uuid, ...rest } = dexieRecord;
        await db.table(config.dexieTable).add({
          ...rest,
          uuid: _uuid,
        });
      }
      pulled++;
    } catch (err) {
      console.error(`[Sync] Pull upsert error for ${config.dexieTable}:`, err);
    }
  }

  // Advance the cursor to the newest row we received (server time), not the
  // client clock. Only move it forward.
  if (maxCursor && maxCursor !== lastPullAt) {
    await db.syncMeta.put({
      tableName: config.dexieTable,
      lastPullAt: maxCursor,
    } as SyncMeta);
  }

  // Rebuild FK maps after pulling new records (for child tables)
  // This is handled by the caller — we just return the count
  return pulled;
}

// ─── Full sync cycle ──────────────────────────────────────────────────

let _syncInProgress = false;
const _listeners = new Set<SyncListener>();
let _currentState: SyncState = "idle";
let _lastError: string | undefined;
let _realtimeChannel: RealtimeChannel | null = null;
let _pushTimer: ReturnType<typeof setTimeout> | null = null;
let _pullInterval: ReturnType<typeof setInterval> | null = null;

function notifyListeners(state: SyncState, error?: string) {
  _currentState = state;
  _lastError = error;
  for (const listener of _listeners) {
    try {
      listener(state, error);
    } catch {
      // Listener threw — ignore
    }
  }
}

export function onSyncStateChange(listener: SyncListener): () => void {
  _listeners.add(listener);
  // Immediately notify with current state
  listener(_currentState, _lastError);
  return () => {
    _listeners.delete(listener);
  };
}

export function getSyncState(): SyncState {
  return _currentState;
}

/**
 * Run a full push+pull sync cycle for all tables.
 */
/**
 * Clear every table's pull cursor and re-pull from scratch. Used by the
 * Settings "Refresh from server" action to recover any rows a stale cursor
 * may have skipped (idempotent — upserts by uuid, dirty local edits kept).
 */
export async function forceFullResync(): Promise<void> {
  await db.syncMeta.clear();
  await syncAll();
}

export async function syncAll(): Promise<void> {
  if (_syncInProgress) return;
  if (!navigator.onLine) {
    notifyListeners("offline");
    return;
  }

  const userId = await getCurrentUserId();
  if (!userId) return;

  _syncInProgress = true;
  notifyListeners("syncing");

  try {
    // ── PUSH phase ──
    // Build id→uuid maps for FK resolution
    const fkUuidMaps = new Map<string, Map<number, string>>();
    for (const tableName of SYNC_ORDER) {
      fkUuidMaps.set(tableName, await buildIdToUuidMap(tableName));
    }

    // Push in dependency order (parents first)
    for (const tableName of SYNC_ORDER) {
      const config = TABLE_CONFIGS.find((c) => c.dexieTable === tableName);
      if (config) {
        await pushTable(config, fkUuidMaps, userId);
        // Refresh UUID map after push (new UUIDs may have been assigned)
        fkUuidMaps.set(tableName, await buildIdToUuidMap(tableName));
      }
    }

    // ── PULL phase ──
    // Build uuid→id maps for FK resolution
    const fkIdMaps = new Map<string, Map<string, number>>();
    for (const tableName of SYNC_ORDER) {
      fkIdMaps.set(tableName, await buildUuidToIdMap(tableName));
    }

    // Pull in dependency order (parents first)
    for (const tableName of SYNC_ORDER) {
      const config = TABLE_CONFIGS.find((c) => c.dexieTable === tableName);
      if (config) {
        await pullTable(config, fkIdMaps, userId);
        // Rebuild maps after pulling (new records may have been added)
        fkIdMaps.set(tableName, await buildUuidToIdMap(tableName));
      }
    }

    notifyListeners("idle");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    console.error("[Sync] Full sync failed:", message);
    notifyListeners("error", message);
  } finally {
    _syncInProgress = false;
  }
}

/**
 * Push only dirty records (called after local mutations).
 */
export async function pushDirty(): Promise<void> {
  if (_syncInProgress || !navigator.onLine) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  _syncInProgress = true;
  notifyListeners("syncing");

  try {
    const fkUuidMaps = new Map<string, Map<number, string>>();
    for (const tableName of SYNC_ORDER) {
      fkUuidMaps.set(tableName, await buildIdToUuidMap(tableName));
    }

    for (const tableName of SYNC_ORDER) {
      const config = TABLE_CONFIGS.find((c) => c.dexieTable === tableName);
      if (config) {
        await pushTable(config, fkUuidMaps, userId);
        fkUuidMaps.set(tableName, await buildIdToUuidMap(tableName));
      }
    }

    notifyListeners("idle");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push failed";
    console.error("[Sync] Push failed:", message);
    notifyListeners("error", message);
  } finally {
    _syncInProgress = false;
  }
}

// ─── Debounced push (called from hooks after mutations) ───────────────

/**
 * Schedule a push 500ms from now. Resets timer on each call (debounce).
 */
export function schedulePush(): void {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => {
    _pushTimer = null;
    pushDirty();
  }, 500);
}

// ─── Realtime subscription ────────────────────────────────────────────

function subscribeRealtime(userId: string): void {
  if (_realtimeChannel) {
    supabase.removeChannel(_realtimeChannel);
  }

  _realtimeChannel = supabase
    .channel("sync-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public" },
      (payload) => {
        // When we receive a change from another device, trigger a pull
        // Only if the change is for our user (RLS guarantees this, but double-check)
        const row = (payload.new || payload.old) as Record<string, unknown> | undefined;
        if (row?.user_id === userId) {
          // Debounce: don't pull immediately on every change
          if (_pushTimer) return; // We're about to push, skip
          syncAll();
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("[Sync] Realtime connected");
      } else if (status === "CHANNEL_ERROR") {
        console.warn("[Sync] Realtime channel error");
      }
    });
}

// ─── Start / stop sync engine ─────────────────────────────────────────

/**
 * Start the sync engine: initial sync, realtime subscription, periodic pull.
 * Call this after the user has authenticated.
 */
// Bump this when a sync-correctness fix requires existing devices to re-pull
// everything once (clears the per-table cursors so the next pull is full).
const SYNC_HEAL_KEY = "traintrack.syncHeal.v2";
async function healStaleCursors(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(SYNC_HEAL_KEY)) return;
    await db.syncMeta.clear();
    window.localStorage.setItem(SYNC_HEAL_KEY, "1");
    console.log("[Sync] Cleared pull cursors for a one-time full re-sync");
  } catch {
    /* non-critical */
  }
}

export async function startSync(userId: string): Promise<void> {
  // One-time heal for the client-clock cursor bug (skipped server updates).
  await healStaleCursors();

  // Initial full sync
  await syncAll();

  // Subscribe to realtime changes
  subscribeRealtime(userId);

  // Periodic pull every 5 minutes as fallback
  if (_pullInterval) clearInterval(_pullInterval);
  _pullInterval = setInterval(() => {
    syncAll();
  }, 5 * 60 * 1000);

  // Listen for online/offline
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  console.log("[Sync] Engine started for user", userId);
}

/**
 * Stop the sync engine: unsubscribe realtime, clear intervals.
 * Call this on sign-out.
 */
export function stopSync(): void {
  if (_realtimeChannel) {
    supabase.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }

  if (_pullInterval) {
    clearInterval(_pullInterval);
    _pullInterval = null;
  }

  if (_pushTimer) {
    clearTimeout(_pushTimer);
    _pushTimer = null;
  }

  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);

  notifyListeners("idle");
  console.log("[Sync] Engine stopped");
}

function handleOnline() {
  console.log("[Sync] Back online — triggering full sync");
  syncAll();
}

function handleOffline() {
  notifyListeners("offline");
}

import { supabase } from "./supabase";
import { syncAll } from "./syncEngine";

/**
 * Strava, through the server ("strava" Edge Function): the tokens stay there,
 * the activities come back as sessions through the usual sync.
 */

export interface StravaStatus {
  connected: boolean;
  athleteId: number | null;
  lastSyncAt: string | null;
}

export interface StravaSyncResult {
  imported?: number;
  seen?: number;
  error?: string;
}

const STATE_KEY = "traintrack.strava.state";
const CONNECTED_KEY = "traintrack.strava.connected";
const AUTO_KEY = "traintrack.strava.autoSyncAt";
/** An automatic import at most this often, when the app opens. */
const AUTO_EVERY_MS = 6 * 3600_000;

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("strava", { body });
  if (error) {
    // The function's own message when it gave one.
    const context = (error as { context?: Response }).context;
    const detail = context && typeof context.json === "function" ? await context.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message ?? "STRAVA_FAILED");
  }
  return data as T;
}

const remember = (connected: boolean) => {
  try {
    if (connected) localStorage.setItem(CONNECTED_KEY, "1");
    else localStorage.removeItem(CONNECTED_KEY);
  } catch {
    // Private window: the next status call tells again.
  }
};

export async function stravaStatus(): Promise<StravaStatus> {
  const s = await call<StravaStatus>({ action: "status" });
  remember(s.connected);
  return s;
}

/** Off to Strava's page to authorize the app; it comes back to /<locale>/strava. */
export async function connectStrava(locale: string): Promise<void> {
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  const { url } = await call<{ url: string }>({ action: "authorize", state, redirectUri: `${window.location.origin}/${locale}/strava` });
  window.location.assign(url);
}

/** Back from Strava: the state checked, the code exchanged, a first import made. */
export async function finishStravaConnect(code: string, state: string | null): Promise<StravaSyncResult> {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!state || state !== expected) throw new Error("STRAVA_STATE");
  const result = await call<StravaSyncResult & { connected: boolean }>({ action: "exchange", code });
  remember(true);
  await syncAll();
  return result;
}

export async function syncStrava(): Promise<StravaSyncResult> {
  const result = await call<StravaSyncResult>({ action: "sync" });
  if (result.imported) await syncAll();
  return result;
}

/** Disconnected: Strava's authorization withdrawn, and the sessions that came from it deleted. */
export async function disconnectStrava(): Promise<void> {
  await call({ action: "disconnect" });
  remember(false);
  await syncAll();
}

/** When the app opens: an import if connected and none for six hours. Silent; offline it waits. */
export async function autoSyncStrava(): Promise<void> {
  try {
    if (localStorage.getItem(CONNECTED_KEY) !== "1" || !navigator.onLine) return;
    const last = Number(localStorage.getItem(AUTO_KEY)) || 0;
    if (Date.now() - last < AUTO_EVERY_MS) return;
    localStorage.setItem(AUTO_KEY, String(Date.now()));
    await syncStrava();
  } catch {
    // Strava unreachable or the connection gone: the Settings section says so.
  }
}

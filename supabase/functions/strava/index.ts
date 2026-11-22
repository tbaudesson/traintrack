// Strava: connect an athlete's account, bring in their activities, disconnect.
// Called by the app with the signed-in user's token; the Strava tokens never
// reach the device (table strava_connections, readable by the server only).
//
//   supabase functions deploy strava
//
// Function secrets: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET. See README.md.
//
// Strava's API agreement: an athlete's Strava data is shown to that athlete
// only (a coach does not see these sessions: migration 080), it is never sent
// to an AI model (the app leaves them out of the assistant's summary), and it
// is deleted when the athlete disconnects.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { alreadyLogged, authorizeUrl, workoutOf, type StravaActivity } from "../_shared/strava.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/** The first import reaches this far back; later ones start from the last. */
const FIRST_DAYS = 90;
/** Activities a call reads at most (100 a page), to stay well within Strava's limits. */
const MAX_PAGES = 3;

function serverKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, unknown>;
    const key = keys.default ?? Object.values(keys)[0];
    if (typeof key === "string" && key) return key;
  } catch {
    // Not set or not JSON: fall back to the legacy key.
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

interface Connection {
  user_id: string;
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  last_sync_at: string | null;
}

async function stravaToken(body: Record<string, string>): Promise<{ access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number } } | null> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: Deno.env.get("STRAVA_CLIENT_ID")!, client_secret: Deno.env.get("STRAVA_CLIENT_SECRET")!, ...body }),
  });
  return res.ok ? await res.json() : null;
}

/** A valid access token, refreshed (and saved) when it is about to expire. */
async function accessToken(db: SupabaseClient, c: Connection): Promise<string | null> {
  if (c.expires_at > Date.now() / 1000 + 300) return c.access_token;
  const t = await stravaToken({ grant_type: "refresh_token", refresh_token: c.refresh_token });
  if (!t) return null;
  await db.from("strava_connections").update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, updated_at: new Date().toISOString() }).eq("user_id", c.user_id);
  return t.access_token;
}

async function sync(db: SupabaseClient, c: Connection): Promise<Record<string, unknown>> {
  const token = await accessToken(db, c);
  if (!token) return { error: "STRAVA_AUTH" };
  const since = c.last_sync_at ? Date.parse(c.last_sync_at) - 86_400_000 : Date.now() - FIRST_DAYS * 86_400_000;
  const activities: StravaActivity[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(since / 1000)}&per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 429) return { error: "STRAVA_RATE_LIMIT", imported: 0 };
    if (!res.ok) return { error: `STRAVA_${res.status}` };
    const batch = (await res.json()) as StravaActivity[];
    activities.push(...batch);
    if (batch.length < 100) break;
  }

  // What the athlete has already: from Strava (by its id), or logged otherwise.
  const from = new Date(since - 86_400_000).toISOString().slice(0, 10);
  const { data: existing, error } = await db
    .from("workouts")
    .select("sport, started_at, date, distance_m, deleted_at, source, external_id")
    .eq("user_id", c.user_id)
    .gte("date", from);
  if (error) return { error: error.message };
  const known = new Set((existing ?? []).filter((w) => w.source === "strava").map((w) => w.external_id));
  const now = new Date().toISOString();
  const rows = activities
    .filter((a) => !known.has(String(a.id)))
    .map((a) => workoutOf(a, c.user_id, crypto.randomUUID(), now))
    .filter((r): r is Record<string, unknown> => !!r && !alreadyLogged(r as never, (existing ?? []) as never));
  if (rows.length) {
    const { error: insertError } = await db.from("workouts").insert(rows);
    if (insertError) return { error: insertError.message };
  }
  await db.from("strava_connections").update({ last_sync_at: now, updated_at: now }).eq("user_id", c.user_id);
  return { imported: rows.length, seen: activities.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "METHOD" }, 405);
  if (!Deno.env.get("STRAVA_CLIENT_ID") || !Deno.env.get("STRAVA_CLIENT_SECRET")) return json({ error: "STRAVA_NOT_CONFIGURED" }, 503);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, serverKey(), { auth: { persistSession: false } });
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth?.user;
  if (!user) return json({ error: "UNAUTHORIZED" }, 401);

  let body: { action?: string; code?: string; state?: string; redirectUri?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  const { data: connection } = await db.from("strava_connections").select("*").eq("user_id", user.id).maybeSingle();

  switch (body.action) {
    case "status":
      return json({ connected: !!connection, athleteId: connection?.athlete_id ?? null, lastSyncAt: connection?.last_sync_at ?? null });

    case "authorize": {
      // The page to send the athlete to; the state comes from the device, which checks it on return.
      if (!body.redirectUri || !/^https?:\/\//.test(body.redirectUri) || !body.state) return json({ error: "BAD_REQUEST" }, 400);
      return json({ url: authorizeUrl(Deno.env.get("STRAVA_CLIENT_ID")!, body.redirectUri, body.state) });
    }

    case "exchange": {
      if (!body.code) return json({ error: "BAD_REQUEST" }, 400);
      const t = await stravaToken({ grant_type: "authorization_code", code: body.code });
      if (!t?.athlete?.id) return json({ error: "STRAVA_AUTH" }, 400);
      const now = new Date().toISOString();
      const { error } = await db.from("strava_connections").upsert({
        user_id: user.id, athlete_id: t.athlete.id, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at,
        created_at: now, updated_at: now,
      });
      if (error) return json({ error: error.message }, 500);
      const { data: fresh } = await db.from("strava_connections").select("*").eq("user_id", user.id).single();
      return json({ connected: true, ...(await sync(db, fresh as Connection)) });
    }

    case "sync":
      if (!connection) return json({ error: "NOT_CONNECTED" }, 400);
      return json(await sync(db, connection as Connection));

    case "disconnect": {
      if (connection) {
        const token = await accessToken(db, connection as Connection);
        if (token) await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        await db.from("strava_connections").delete().eq("user_id", user.id);
      }
      // What came from Strava goes with it (the API agreement asks for it).
      const now = new Date().toISOString();
      const { error } = await db.from("workouts").update({ deleted_at: now, updated_at: now }).eq("user_id", user.id).eq("source", "strava").is("deleted_at", null);
      if (error) return json({ error: error.message }, 500);
      return json({ connected: false });
    }

    default:
      return json({ error: "BAD_REQUEST" }, 400);
  }
});

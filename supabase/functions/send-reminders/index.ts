// Scheduled Edge Function, every 15 minutes: training reminders an hour before
// the usual time, and notifications for a coach's comment, a new program and a
// new message. Each device chooses what it wants (push_subscriptions
// .notify_prefs) and is spoken to in its language and time zone. push_log
// keeps what was sent, so nothing is sent twice. Runs with the service role;
// deployed without JWT checks so the scheduler can reach it, hence the shared
// secret. See README.md.
//
//   supabase functions deploy send-reminders --no-verify-jwt
//
// Function secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
// CRON_SECRET (the same as send-compliance-alerts).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import { localClock, notification, reminderDue, wants, type NotifyKind, type NotifyPrefs } from "../_shared/reminders.ts";

interface Sub {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  notify_prefs: NotifyPrefs | null;
  time_zone: string | null;
  locale: string | null;
}

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return false; // unconfigured means closed, not open
  const given = new TextEncoder().encode(req.headers.get("Authorization") ?? "");
  const expected = new TextEncoder().encode(`Bearer ${secret}`);
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given[i] ^ expected[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const requested = Number(new URL(req.url).searchParams.get("window") ?? "15");
  const windowMin = Number.isInteger(requested) && requested >= 5 && requested <= 60 ? requested : 15;
  const now = new Date();
  // Events are looked for over twice the window: a late run misses nothing,
  // and push_log keeps an event from being sent twice.
  const since = new Date(now.getTime() - 2 * windowMin * 60_000).toISOString();

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@traintrack.app",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: subsData, error } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth, notify_prefs, time_zone, locale");
  if (error) return new Response(error.message, { status: 500 });
  const subs = (subsData ?? []) as Sub[];
  const byUser = new Map<string, Sub[]>();
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  /** Record the event; false when it was already sent. */
  async function firstTime(key: string, userId: string): Promise<boolean> {
    const { error } = await supabase.from("push_log").insert({ key, user_id: userId });
    return !error;
  }

  let sent = 0;
  /** Send to every device of the user that wants this kind of notification. */
  async function notify(userId: string, kind: NotifyKind, name: string) {
    for (const s of byUser.get(userId) ?? []) {
      if (!wants(s.notify_prefs, kind)) continue;
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(notification(kind, s.locale, name)));
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }

  const users = [...byUser.keys()];
  if (!users.length) return Response.json({ ok: true, sent });

  // ── Training reminders ────────────────────────────────────────────
  const { data: profiles } = await supabase
    .from("athlete_profiles")
    .select("user_id, training_days, training_time")
    .in("user_id", users)
    .is("deleted_at", null);
  for (const p of profiles ?? []) {
    const device = (byUser.get(p.user_id) ?? []).find((s) => wants(s.notify_prefs, "reminder"));
    if (!device) continue;
    const clock = localClock(device.time_zone, now);
    if (!reminderDue({ trainingDays: p.training_days, trainingTime: p.training_time }, clock, windowMin)) continue;
    // Already trained today: no need to be reminded.
    const { data: done } = await supabase.from("workouts").select("id").eq("user_id", p.user_id).eq("date", clock.date).is("deleted_at", null).limit(1);
    if (done?.length) continue;
    if (await firstTime(`reminder:${p.user_id}:${clock.date}`, p.user_id)) await notify(p.user_id, "reminder", p.training_time);
  }

  // ── Events: names of who did them ─────────────────────────────────
  const names = new Map<string, string>();
  async function nameOf(userId: string): Promise<string> {
    if (!names.has(userId)) {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
      names.set(userId, data?.display_name || "TrainTrack");
    }
    return names.get(userId)!;
  }

  // A coach's comment on a session: a note by someone else than the athlete.
  const { data: notes } = await supabase.from("workout_notes").select("id, user_id, workout_id").gte("created_at", since).is("deleted_at", null);
  if (notes?.length) {
    const { data: owners } = await supabase.from("workouts").select("id, user_id").in("id", [...new Set(notes.map((n) => n.workout_id))]);
    const ownerOf = new Map((owners ?? []).map((w) => [w.id, w.user_id as string]));
    for (const n of notes) {
      const owner = ownerOf.get(n.workout_id);
      if (!owner || owner === n.user_id || !byUser.has(owner)) continue;
      if (await firstTime(`comment:${n.id}`, owner)) await notify(owner, "comment", await nameOf(n.user_id));
    }
  }

  // A program assigned by a coach.
  const { data: programs } = await supabase
    .from("programs")
    .select("id, user_id, assigned_to_user_id")
    .gte("created_at", since)
    .not("assigned_to_user_id", "is", null)
    .is("deleted_at", null);
  for (const p of programs ?? []) {
    if (p.assigned_to_user_id === p.user_id || !byUser.has(p.assigned_to_user_id)) continue;
    if (await firstTime(`program:${p.id}`, p.assigned_to_user_id)) await notify(p.assigned_to_user_id, "program", await nameOf(p.user_id));
  }

  // A message not read yet.
  const { data: messages } = await supabase
    .from("messages")
    .select("id, user_id, recipient_id")
    .gte("created_at", since)
    .is("read_at", null)
    .is("deleted_at", null);
  for (const m of messages ?? []) {
    if (!byUser.has(m.recipient_id)) continue;
    if (await firstTime(`message:${m.id}`, m.recipient_id)) await notify(m.recipient_id, "message", await nameOf(m.user_id));
  }

  // The log only needs to outlive the look-back window; a month is plenty.
  await supabase.from("push_log").delete().lt("sent_at", new Date(now.getTime() - 30 * 86_400_000).toISOString());

  return Response.json({ ok: true, sent });
});

// Scheduled Edge Function: push a compliance alert to each trainer whose
// clients have stopped training. Deploy with the Supabase CLI and schedule it
// (see README.md). Runs with the service role. Deployed without JWT checks so
// the scheduler can reach it, hence the shared secret below.
//
//   supabase functions deploy send-compliance-alerts --no-verify-jwt
//
// Required function secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@app.com)
//   CRON_SECRET (the scheduler sends it as a bearer token)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@traintrack.app";
  const requested = Number(new URL(req.url).searchParams.get("days") ?? "3");
  const days = Number.isInteger(requested) && requested >= 1 && requested <= 365 ? requested : 3;

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: alerts, error } = await supabase.rpc("get_all_compliance_alerts", { p_days: days });
  if (error) return new Response(error.message, { status: 500 });

  // Group the inactive clients by trainer.
  const byTrainer = new Map<string, { client_name: string; days_since: number }[]>();
  for (const a of alerts ?? []) {
    const list = byTrainer.get(a.trainer_id) ?? [];
    list.push({ client_name: a.client_name, days_since: a.days_since });
    byTrainer.set(a.trainer_id, list);
  }

  let sent = 0;
  for (const [trainerId, list] of byTrainer) {
    const { data: subs } = await supabase
      .from("push_subscriptions").select("*").eq("user_id", trainerId);
    if (!subs?.length) continue;

    const body =
      list.length === 1
        ? `${list[0].client_name} hasn't trained ${list[0].days_since >= 9999 ? "in a while" : `in ${list[0].days_since} days`}.`
        : `${list.length} of your clients need attention.`;
    const payload = JSON.stringify({ title: "Client compliance", body, url: "/teams" });

    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, trainers: byTrainer.size, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});

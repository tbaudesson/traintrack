# Reminders and notifications

Sends, every 15 minutes:

- a **training reminder** an hour before the usual time, on the training days
  set in Settings › Week plan, unless a session was already logged that day;
- a notification when **a coach comments** a session, **assigns a program**,
  or when **a message** arrives.

Each device chooses what it wants in Settings › Notifications. The function
speaks each device's language and uses its time zone. `push_log` remembers
what was sent, so nothing is sent twice even if a run is late or repeated.

## Setup (once)

These steps are the same as for `send-compliance-alerts`; skip those already
done.

1. **Migrations 043 and 046** (`supabase/migrations/043_reminders.sql`, `046_security_review.sql`) applied.
2. **VAPID keys**: `npx web-push generate-vapid-keys`, then in Vercel (and
   `.env.local`) set `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>` and redeploy.
   The Settings › Notifications section then offers to turn them on.
3. **Function secrets**, then deploy:

   ```bash
   supabase secrets set \
     VAPID_PUBLIC_KEY=<public key> \
     VAPID_PRIVATE_KEY=<private key> \
     VAPID_SUBJECT=mailto:you@yourdomain.com \
     CRON_SECRET=<long random value, e.g. openssl rand -hex 32>

   supabase functions deploy send-reminders --no-verify-jwt
   ```

4. **Schedule it** every 15 minutes (Supabase dashboard › Database › Cron, or
   the SQL editor; needs the `pg_cron` and `pg_net` extensions):

   ```sql
   select cron.schedule(
     'send-reminders',
     '*/15 * * * *',
     $$
     select net.http_post(
       url := 'https://<PROJECT_REF>.functions.supabase.co/send-reminders?window=15',
       headers := jsonb_build_object('Authorization', 'Bearer ' || '<CRON_SECRET>')
     );
     $$
   );
   ```

   Keep `window` equal to the schedule's interval in minutes: a reminder is
   due once per window. Use `CRON_SECRET` here, never the service role key:
   the job's SQL is stored in clear in `cron.job`.

## How it decides

The decisions (local time of a device, whether a reminder is due, the texts)
live in `../_shared/reminders.ts`, tested by `src/lib/reminders.test.ts`.
Dead subscriptions (HTTP 404/410) are removed as they are met.

# Compliance alert push notifications

In-app compliance flags (the amber "X days ago" chip on the team roster) work
with no setup. **Push notifications** to trainers are optional and need a few
one-time steps because Web Push requires VAPID keys and a scheduled sender.

## 1. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Note the **public** and **private** keys.

## 2. Configure the web app

In Vercel (and `.env.local`) set:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
```

Redeploy. The **Settings → Notifications** toggle now appears (Android/desktop
Chrome, and iOS 16.4+ installed PWAs). Each user who enables it stores a push
subscription in `push_subscriptions`.

## 3. Configure & deploy the Edge Function

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=<public key> \
  VAPID_PRIVATE_KEY=<private key> \
  VAPID_SUBJECT=mailto:you@yourdomain.com

supabase functions deploy send-compliance-alerts --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

## 4. Schedule it (daily)

In the Supabase dashboard → **Database → Cron** (pg_cron), or SQL editor:

```sql
select cron.schedule(
  'compliance-alerts',
  '0 18 * * *',  -- every day at 18:00 UTC
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/send-compliance-alerts?days=3',
    headers := jsonb_build_object('Authorization', 'Bearer ' || '<SERVICE_ROLE_KEY>')
  );
  $$
);
```

The function reads `get_all_compliance_alerts(days)` (service-role only), groups
inactive clients by trainer, and sends one push per trainer. Dead subscriptions
(HTTP 404/410) are cleaned up automatically.

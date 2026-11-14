-- 043_reminders.sql
-- Reminders and notifications, chosen on each device: a reminder an hour
-- before the usual training time on training days, and a notification when
-- the coach comments a session, assigns a program or a message arrives.
-- push_subscriptions keeps the choices and the time zone of each device;
-- push_log remembers what was sent, so the scheduled sender never sends the
-- same thing twice. Read by the send-reminders Edge Function only.
--
-- Deploy: apply this file first, then the code (it writes the new columns),
-- then deploy and schedule the function (supabase/functions/send-reminders).
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS notify_prefs JSONB;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS time_zone TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS locale TEXT;

ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_prefs_check;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_prefs_check CHECK (
  (notify_prefs IS NULL OR jsonb_typeof(notify_prefs) = 'object')
  AND (time_zone IS NULL OR char_length(time_zone) <= 64)
  AND (locale IS NULL OR locale IN ('fr', 'en', 'de'))
);

CREATE TABLE IF NOT EXISTS push_log (
  key TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_log_sent ON push_log(sent_at);

-- Only the service role (the Edge Function) touches it: RLS on, no policy.
ALTER TABLE push_log ENABLE ROW LEVEL SECURITY;

COMMIT;

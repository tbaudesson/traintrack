-- 049_team_invite_links.sql
-- Invitation links: a coach invites an athlete with a link (to share by
-- message, or as a QR code) instead of an e-mail address, and can prepare
-- the athlete’s arrival: a program with its start and days, and a welcome
-- message. The athlete signs up with any address and joins in one tap.
--
-- Security:
-- - The token is 244 random bits and only its SHA-256 is stored: the table
--   alone cannot open an invitation.
-- - A link is used once, expires after 14 days, and the coach can revoke it.
--   At most 50 open links per team.
-- - Nobody reads or writes the table directly: everything goes through the
--   functions below, for signed-in active accounts only (never anon).
-- - A wrong, used, revoked or expired link gives the same answer, and
--   reveals nothing.
-- - Joining is the athlete’s own act (the app asks for consent first): it
--   makes them an active member, which opens their data to the coach, as an
--   accepted e-mail invitation does.
-- - A coach’s invitation counts as approval of the account, as an admin’s
--   does: an account created with a valid link (the token is sent with the
--   sign-up), or with an address a coach invited, starts active. A link
--   approves one account only: the first one claims it, and only that one
--   can then join with it.
--
-- Deploy: apply this file first, then the code.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT CHECK (label IS NULL OR char_length(label) <= 80),
  program_name TEXT CHECK (program_name IS NULL OR char_length(program_name) <= 120),
  program_structure JSONB CHECK (
    program_structure IS NULL OR (jsonb_typeof(program_structure) = 'array' AND pg_column_size(program_structure) <= 300000)
  ),
  start_date DATE,
  weekdays JSONB CHECK (weekdays IS NULL OR (jsonb_typeof(weekdays) = 'array' AND weekdays <@ '[1,2,3,4,5,6,7]'::jsonb)),
  welcome TEXT CHECK (welcome IS NULL OR char_length(welcome) <= 2000),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '14 days',
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_invites_program_named CHECK (program_structure IS NULL OR program_name IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_team_invites_group ON team_invites(group_id);

-- No policy: no direct access at all, only through the functions.
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON team_invites FROM anon, authenticated;

CREATE OR REPLACE FUNCTION invite_token_hash(p_token TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(coalesce(p_token, '-'), 'UTF8')), 'hex');
$$;

-- ─── A coach creates a link ─────────────────────────────────
CREATE OR REPLACE FUNCTION create_team_invite(
  p_group_id UUID,
  p_label TEXT DEFAULT NULL,
  p_program_name TEXT DEFAULT NULL,
  p_program JSONB DEFAULT NULL,
  p_start DATE DEFAULT NULL,
  p_weekdays JSONB DEFAULT NULL,
  p_welcome TEXT DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID; v_token TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT is_active_account() OR NOT is_group_owner_or_manager(p_group_id) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  SELECT user_id INTO v_owner FROM groups WHERE id = p_group_id AND deleted_at IS NULL;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF NOT has_plan_feature(v_owner, 'coaching') THEN
    RAISE EXCEPTION 'PLAN_REQUIRED';
  END IF;
  IF (SELECT count(*) FROM team_invites
      WHERE group_id = p_group_id AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()) >= 50 THEN
    RAISE EXCEPTION 'TOO_MANY_INVITES';
  END IF;
  -- Two random UUIDs, 64 hex digits: 244 random bits.
  v_token := encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'hex');
  INSERT INTO team_invites (group_id, created_by, token_hash, label, program_name, program_structure, start_date, weekdays, welcome)
  VALUES (
    p_group_id, auth.uid(), invite_token_hash(v_token),
    CASE WHEN length(btrim(p_label)) > 0 THEN btrim(p_label) END,
    CASE WHEN p_program IS NOT NULL AND length(btrim(p_program_name)) > 0 THEN btrim(p_program_name) END,
    p_program, p_start, p_weekdays,
    CASE WHEN length(btrim(p_welcome)) > 0 THEN btrim(p_welcome) END
  );
  RETURN v_token;
END;
$$;

-- ─── The athlete sees what the link offers ──────────────────
CREATE OR REPLACE FUNCTION preview_team_invite(p_token TEXT)
RETURNS TABLE (team_name TEXT, coach_name TEXT, label TEXT, program_name TEXT, start_date DATE, weekdays JSONB, welcome TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.name, p.display_name, i.label, i.program_name, i.start_date, i.weekdays, i.welcome
  FROM team_invites i
  JOIN groups g ON g.id = i.group_id AND g.deleted_at IS NULL
  LEFT JOIN profiles p ON p.user_id = i.created_by
  WHERE auth.uid() IS NOT NULL AND is_active_account()
    AND i.token_hash = invite_token_hash(p_token)
    AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
    AND (i.claimed_by IS NULL OR i.claimed_by = auth.uid());
$$;

-- ─── The athlete joins ───────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_team_invite(p_token TEXT)
RETURNS TABLE (team_name TEXT, coach_name TEXT, program_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv team_invites%ROWTYPE; v_owner UUID; v_email TEXT; v_program UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT is_active_account() THEN
    RAISE EXCEPTION 'INVALID_INVITE';
  END IF;
  SELECT * INTO v_inv FROM team_invites WHERE token_hash = invite_token_hash(p_token) FOR UPDATE;
  IF NOT FOUND OR v_inv.used_at IS NOT NULL OR v_inv.revoked_at IS NOT NULL OR v_inv.expires_at <= now()
     OR (v_inv.claimed_by IS NOT NULL AND v_inv.claimed_by <> auth.uid()) THEN
    RAISE EXCEPTION 'INVALID_INVITE';
  END IF;
  SELECT user_id INTO v_owner FROM groups WHERE id = v_inv.group_id AND deleted_at IS NULL;
  IF v_owner IS NULL OR NOT has_plan_feature(v_owner, 'coaching') THEN
    RAISE EXCEPTION 'INVALID_INVITE';
  END IF;
  IF v_owner = auth.uid() OR v_inv.created_by = auth.uid() THEN
    RAISE EXCEPTION 'OWN_TEAM';
  END IF;
  IF EXISTS (SELECT 1 FROM group_members
             WHERE group_id = v_inv.group_id AND user_id = auth.uid() AND status = 'active' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  -- An e-mail invitation still pending in this team becomes this membership.
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  UPDATE group_members
  SET user_id = auth.uid(), status = 'active', joined_at = now()
  WHERE group_id = v_inv.group_id AND deleted_at IS NULL AND status = 'pending'
    AND (user_id = auth.uid() OR (v_email IS NOT NULL AND lower(invited_email) = lower(v_email)));
  IF NOT FOUND THEN
    INSERT INTO group_members (group_id, user_id, invited_email, role, status, joined_at)
    VALUES (v_inv.group_id, auth.uid(), lower(coalesce(v_email, auth.uid()::text)), 'member', 'active', now());
  END IF;

  UPDATE team_invites SET used_by = auth.uid(), used_at = now() WHERE id = v_inv.id;

  -- The program the coach prepared: the coach’s copy for this athlete.
  IF v_inv.program_structure IS NOT NULL THEN
    INSERT INTO programs (user_id, owner_user_id, assigned_to_user_id, group_id, name, structure, start_date, weekdays)
    VALUES (v_inv.created_by, v_inv.created_by, auth.uid(), v_inv.group_id, v_inv.program_name,
            v_inv.program_structure, v_inv.start_date, v_inv.weekdays)
    RETURNING id INTO v_program;
  END IF;
  IF v_inv.welcome IS NOT NULL THEN
    INSERT INTO messages (user_id, recipient_id, body) VALUES (v_inv.created_by, auth.uid(), v_inv.welcome);
  END IF;

  RETURN QUERY
  SELECT g.name, p.display_name, v_program
  FROM groups g LEFT JOIN profiles p ON p.user_id = v_inv.created_by
  WHERE g.id = v_inv.group_id;
END;
$$;

-- ─── The coach follows and revokes the links ────────────────
CREATE OR REPLACE FUNCTION list_team_invites(p_group_id UUID)
RETURNS TABLE (id UUID, label TEXT, program_name TEXT, start_date DATE, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
               used_at TIMESTAMPTZ, used_by UUID, used_by_name TEXT, revoked_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT is_active_account() OR NOT is_group_owner_or_manager(p_group_id) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  RETURN QUERY
  SELECT i.id, i.label, i.program_name, i.start_date, i.created_at, i.expires_at, i.used_at, i.used_by, p.display_name, i.revoked_at
  FROM team_invites i LEFT JOIN profiles p ON p.user_id = i.used_by
  WHERE i.group_id = p_group_id
  ORDER BY i.created_at DESC
  LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION revoke_team_invite(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group UUID;
BEGIN
  SELECT group_id INTO v_group FROM team_invites WHERE id = p_id;
  IF v_group IS NULL OR auth.uid() IS NULL OR NOT is_active_account() OR NOT is_group_owner_or_manager(v_group) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  UPDATE team_invites SET revoked_at = now() WHERE id = p_id AND used_at IS NULL AND revoked_at IS NULL;
END;
$$;


-- ─── A coach’s invitation approves the new account ──────────
-- Same as 011, plus: a valid link sent with the sign-up (claimed by this
-- account), or a coach’s pending e-mail invitation, starts the account active.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_default_plan UUID;
  v_inv invitations%ROWTYPE;
  v_status TEXT;
  v_link UUID;
BEGIN
  SELECT id INTO v_default_plan FROM plans WHERE is_default LIMIT 1;

  SELECT * INTO v_inv FROM invitations
  WHERE lower(email) = lower(NEW.email) AND status = 'pending'
  LIMIT 1;

  -- A coach’s link, still open and not claimed by another account.
  IF NEW.raw_user_meta_data ? 'team_invite' THEN
    UPDATE team_invites i SET claimed_by = NEW.id
    WHERE i.token_hash = invite_token_hash(NEW.raw_user_meta_data->>'team_invite')
      AND i.claimed_by IS NULL AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
      AND EXISTS (SELECT 1 FROM groups g WHERE g.id = i.group_id AND g.deleted_at IS NULL AND has_plan_feature(g.user_id, 'coaching'))
    RETURNING i.id INTO v_link;
  END IF;

  IF v_inv.id IS NOT NULL THEN
    UPDATE invitations SET status = 'accepted' WHERE id = v_inv.id;
    v_status := 'active';   -- invited by an admin: approved
  ELSIF v_link IS NOT NULL OR EXISTS (
    SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
    WHERE lower(gm.invited_email) = lower(NEW.email) AND gm.status = 'pending' AND gm.deleted_at IS NULL
      AND has_plan_feature(g.user_id, 'coaching')
  ) THEN
    v_status := 'active';   -- invited by a coach: approved
  ELSE
    v_status := 'pending';  -- needs admin approval
  END IF;

  INSERT INTO profiles (user_id, email, display_name, status, plan_id)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    v_status, v_default_plan
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION create_team_invite(UUID, TEXT, TEXT, JSONB, DATE, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION preview_team_invite(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION accept_team_invite(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION list_team_invites(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION revoke_team_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_team_invite(UUID, TEXT, TEXT, JSONB, DATE, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION preview_team_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_team_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_team_invites(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_team_invite(UUID) TO authenticated;

COMMIT;

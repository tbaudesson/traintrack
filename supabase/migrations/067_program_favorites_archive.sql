-- 067_program_favorites_archive.sql
-- One's programs can be kept at the top (favorite) or put away (archived_at):
-- an archived program leaves the planning and the session picker, its
-- sessions and history stay. Both travel with the program between devices.
-- Safe to run again.

ALTER TABLE programs ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

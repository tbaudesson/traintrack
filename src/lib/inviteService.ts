import type { ProgramDay } from "@/db";
import { supabase } from "./supabase";
import { sanitizeStructure } from "./programSanitize";

/**
 * Invitation links (migration 049): a coach makes a link, possibly with a
 * program, its start and days, and a welcome message; the athlete opens it,
 * signs up or in, and joins. The token travels after the "#" of the link,
 * which browsers never send to a server, so it is not left in any log.
 */

export interface InvitePreview {
  teamName: string;
  coachName: string | null;
  label: string | null;
  programName: string | null;
  startDate: string | null;
  weekdays: number[] | null;
  welcome: string | null;
}

export interface TeamInvite {
  id: string;
  label: string | null;
  programName: string | null;
  startDate: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
  usedByName: string | null;
  revokedAt: string | null;
}

export type InviteState = "open" | "used" | "expired" | "revoked";

export const inviteState = (i: Pick<TeamInvite, "usedAt" | "revokedAt" | "expiresAt">, now = Date.now()): InviteState =>
  i.usedAt ? "used" : i.revokedAt ? "revoked" : Date.parse(i.expiresAt) <= now ? "expired" : "open";

/** The link to share, in the app's language. */
export const inviteLink = (origin: string, locale: string, token: string) => `${origin}/${locale}/join#${token}`;

/** A token read from a link's "#", or null when it does not look like one. */
export const tokenFromHash = (hash: string) => {
  const token = hash.replace(/^#/, "").trim();
  return /^[0-9a-f]{64}$/.test(token) ? token : null;
};

const fail = (message: string) => {
  const code = ["NOT_ALLOWED", "PLAN_REQUIRED", "TOO_MANY_INVITES", "INVALID_INVITE", "OWN_TEAM", "ALREADY_MEMBER"].find((c) => message.includes(c));
  return new Error(code ?? message);
};

export async function createInvite(input: {
  groupId: string;
  label?: string;
  program?: { name: string; structure: ProgramDay[] } | null;
  startDate?: string | null;
  weekdays?: number[] | null;
  welcome?: string;
}): Promise<string> {
  const structure = input.program ? sanitizeStructure(input.program.structure) : null;
  const { data, error } = await supabase.rpc("create_team_invite", {
    p_group_id: input.groupId,
    p_label: input.label?.slice(0, 80) || null,
    p_program_name: input.program ? input.program.name.slice(0, 120) : null,
    p_program: structure,
    p_start: input.program ? input.startDate || null : null,
    p_weekdays: input.program && input.weekdays?.length ? input.weekdays : null,
    p_welcome: input.welcome?.slice(0, 2000) || null,
  });
  if (error) throw fail(error.message);
  return data as string;
}

export async function previewInvite(token: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase.rpc("preview_team_invite", { p_token: token });
  if (error) throw fail(error.message);
  const row = (data as Record<string, unknown>[] | null)?.[0];
  if (!row) return null;
  return {
    teamName: String(row.team_name ?? ""),
    coachName: (row.coach_name as string | null) ?? null,
    label: (row.label as string | null) ?? null,
    programName: (row.program_name as string | null) ?? null,
    startDate: (row.start_date as string | null) ?? null,
    weekdays: Array.isArray(row.weekdays) ? (row.weekdays as number[]) : null,
    welcome: (row.welcome as string | null) ?? null,
  };
}

export async function acceptInvite(token: string): Promise<{ teamName: string; coachName: string | null; programId: string | null }> {
  const { data, error } = await supabase.rpc("accept_team_invite", { p_token: token });
  if (error) throw fail(error.message);
  const row = (data as Record<string, unknown>[] | null)?.[0] ?? {};
  return { teamName: String(row.team_name ?? ""), coachName: (row.coach_name as string | null) ?? null, programId: (row.program_id as string | null) ?? null };
}

export async function listInvites(groupId: string): Promise<TeamInvite[]> {
  const { data, error } = await supabase.rpc("list_team_invites", { p_group_id: groupId });
  if (error) throw fail(error.message);
  return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
    id: String(r.id),
    label: (r.label as string | null) ?? null,
    programName: (r.program_name as string | null) ?? null,
    startDate: (r.start_date as string | null) ?? null,
    createdAt: String(r.created_at),
    expiresAt: String(r.expires_at),
    usedAt: (r.used_at as string | null) ?? null,
    usedBy: (r.used_by as string | null) ?? null,
    usedByName: (r.used_by_name as string | null) ?? null,
    revokedAt: (r.revoked_at as string | null) ?? null,
  }));
}

export async function revokeInvite(id: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_team_invite", { p_id: id });
  if (error) throw fail(error.message);
}

// ─── A link opened before signing in ─────────────────────────────

const PENDING = "traintrack-join";
const JOINED = "traintrack-joined";

/** Keep a link's token across sign-up (and the e-mail confirmation), on this device. */
export function rememberInvite(token: string): void {
  try {
    window.localStorage.setItem(PENDING, token);
  } catch {
    // Private window: the link has to be opened again once signed in.
  }
}

export function pendingInvite(): string | null {
  try {
    return typeof window === "undefined" ? null : tokenFromHash(window.localStorage.getItem(PENDING) ?? "");
  } catch {
    return null;
  }
}

export function forgetInvite(): void {
  try {
    window.localStorage.removeItem(PENDING);
  } catch {
    // Nothing kept.
  }
}

/** What the coach prepared, for the sign-up that follows the joining. */
export interface Joined {
  teamName: string;
  coachName: string | null;
  programName: string | null;
  startDate: string | null;
  weekdays: number[] | null;
}

export function rememberJoined(joined: Joined): void {
  try {
    window.localStorage.setItem(JOINED, JSON.stringify(joined));
  } catch {
    // The sign-up then simply asks for a program.
  }
}

export function joinedTeam(): Joined | null {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(JOINED);
    return raw ? (JSON.parse(raw) as Joined) : null;
  } catch {
    return null;
  }
}

export function forgetJoined(): void {
  try {
    window.localStorage.removeItem(JOINED);
  } catch {
    // Nothing kept.
  }
}

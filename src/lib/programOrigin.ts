import type { Program } from "@/db";

/**
 * Where a program in one's list comes from, which decides what one can do
 * with it:
 * - "coach": given by a coach. Followed as it is; only the coach changes it.
 * - "followed": a ready-made program added to one's list. Followed as it is,
 *   or left (unsubscribe); "Customise" turns it into one's own.
 * - "mine": built by oneself, or by a coach for a client: edited freely.
 */
export type ProgramOrigin = "coach" | "followed" | "mine";

export function programOrigin(
  program: Pick<Program, "name" | "ownerUserId" | "assignedToUserId">,
  me: string | null | undefined,
  readyMadeNames: Set<string>
): ProgramOrigin {
  const ownedByMe = !program.ownerUserId || program.ownerUserId === me;
  if (!ownedByMe && program.assignedToUserId === me) return "coach";
  // A coach's copy for a client stays theirs to adapt, even if ready-made.
  const forSomeoneElse = !!program.assignedToUserId && program.assignedToUserId !== me;
  if (ownedByMe && !forSomeoneElse && readyMadeNames.has(program.name)) return "followed";
  return "mine";
}

/** What "Customise" renames a ready-made program to: it is no longer the ready-made one. */
export const customisedName = (name: string, suffix: string) => `${name} (${suffix})`;

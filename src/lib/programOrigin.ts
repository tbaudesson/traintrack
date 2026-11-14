import type { Program, ProgramDay } from "@/db";

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

/**
 * What a program asks for, whatever its language: the exercises (named in
 * English everywhere), sets and reps, and the sport and length of cardio
 * days. The same ready-made program in French and in English shares it.
 */
export const programFingerprint = (structure: ProgramDay[] | undefined) =>
  (structure ?? [])
    .map((d) =>
      [
        d.week ?? "",
        d.exercises.map((e) => `${e.exerciseName}:${e.targetSets}:${e.targetReps}`).join(","),
        d.cardio ? `${d.cardio.sport}:${d.cardio.durationMin ?? ""}:${d.cardio.distanceKm ?? ""}` : "",
      ].join("/")
    )
    .join("|");

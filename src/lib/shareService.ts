import type { ProgramDay } from "@/db";
import { supabase } from "./supabase";
import { sanitizeStructure } from "./programSanitize";

export interface SharedProgram {
  name: string;
  description: string | null;
  structure: ProgramDay[];
  sharedBy: string;
  createdAt: string;
}

/** Share a copy of a program: its id makes the link. Needs the network. */
export async function shareProgram(program: { name: string; description?: string | null; structure: ProgramDay[] }): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("NOT_AUTHENTICATED");
  const { data, error } = await supabase
    .from("shared_programs")
    .insert({
      user_id: auth.user.id,
      name: program.name.slice(0, 120),
      description: program.description ? program.description.slice(0, 2000) : null,
      structure: sanitizeStructure(program.structure),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** A shared program, by the id in its link; null when the link leads nowhere. */
export async function getSharedProgram(id: string): Promise<SharedProgram | null> {
  const { data, error } = await supabase.rpc("get_shared_program", { p_id: id });
  if (error) throw new Error(error.message);
  const row = (data as { name: string; description: string | null; structure: unknown; shared_by: string; created_at: string }[] | null)?.[0];
  if (!row) return null;
  // Written by someone else: only what a program can hold is kept.
  return {
    name: String(row.name ?? "").slice(0, 120),
    description: row.description ? String(row.description).slice(0, 2000) : null,
    structure: sanitizeStructure(row.structure),
    sharedBy: String(row.shared_by ?? "").slice(0, 80),
    createdAt: row.created_at,
  };
}

/** The link to a share, in the app's language. */
export const shareLink = (origin: string, locale: string, id: string) => `${origin}/${locale}/share/${id}`;

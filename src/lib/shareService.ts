import type { ProgramDay } from "@/db";
import { supabase } from "./supabase";

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
      structure: program.structure,
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
  const row = (data as { name: string; description: string | null; structure: ProgramDay[]; shared_by: string; created_at: string }[] | null)?.[0];
  return row ? { name: row.name, description: row.description, structure: row.structure, sharedBy: row.shared_by, createdAt: row.created_at } : null;
}

/** The link to a share, in the app's language. */
export const shareLink = (origin: string, locale: string, id: string) => `${origin}/${locale}/share/${id}`;

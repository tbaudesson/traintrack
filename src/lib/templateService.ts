import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import type { PlanLocale } from "./enduranceText";
import type { ProgramDay } from "@/db";
import { supabase } from "./supabase";
import { PROGRAM_TEMPLATES, type ProgramGoal, type ProgramLevel, type ProgramTemplate } from "./programTemplates";

export interface AdminTemplate extends ProgramTemplate {
  isPublished: boolean;
  sortOrder: number;
}

interface Row {
  id: string;
  name: string;
  description: string;
  goal: ProgramGoal;
  level: ProgramLevel;
  days_per_week: number;
  home_friendly: boolean;
  structure: ProgramDay[];
  is_published: boolean;
  sort_order: number;
  /** Absent until migration 026 is applied. */
  locale?: PlanLocale | null;
}

const TABLE = "program_templates";

function fromRow(r: Row): AdminTemplate {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    goal: r.goal,
    level: r.level,
    homeFriendly: r.home_friendly,
    structure: r.structure ?? [],
    daysPerWeek: r.days_per_week,
    isPublished: r.is_published,
    sortOrder: r.sort_order,
    locale: r.locale ?? undefined,
  };
}

function toRow(t: Partial<AdminTemplate>): Partial<Row> {
  const row: Partial<Row> = {};
  if (t.name !== undefined) row.name = t.name;
  if (t.description !== undefined) row.description = t.description;
  if (t.goal !== undefined) row.goal = t.goal;
  if (t.level !== undefined) row.level = t.level;
  if (t.daysPerWeek !== undefined) row.days_per_week = t.daysPerWeek;
  if (t.homeFriendly !== undefined) row.home_friendly = t.homeFriendly;
  if (t.structure !== undefined) row.structure = t.structure;
  if (t.isPublished !== undefined) row.is_published = t.isPublished;
  if (t.sortOrder !== undefined) row.sort_order = t.sortOrder;
  if ("locale" in t) row.locale = t.locale ?? null;
  return row;
}

/** Published for everyone; the policies also return hidden ones to admins. */
export async function listTemplates(): Promise<AdminTemplate[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("sort_order").order("name");
  if (error) throw new Error(error.message);
  return (data as Row[]).map(fromRow);
}

export async function getTemplate(id: string): Promise<AdminTemplate | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as Row) : null;
}

export async function createTemplate(t: Partial<AdminTemplate> & { name: string }): Promise<string> {
  const { data, error } = await supabase.from(TABLE).insert(toRow(t)).select("id").single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function updateTemplate(id: string, t: Partial<AdminTemplate>): Promise<void> {
  const { error } = await supabase.from(TABLE).update(toRow(t)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** A template is offered to everyone, or only to users of its language. */
export const speaks = (locale: string) => (t: Pick<ProgramTemplate, "locale">) => !t.locale || t.locale === locale;

/**
 * The catalogue offered to users, in their language. Starts from the built-in
 * list, which also stands in when offline. An admin's view is narrowed to what
 * users see.
 */
export function useProgramTemplates(): ProgramTemplate[] {
  const locale = useLocale();
  const [templates, setTemplates] = useState<ProgramTemplate[]>(PROGRAM_TEMPLATES);
  useEffect(() => {
    listTemplates()
      .then((all) => setTemplates(all.filter((t) => t.isPublished)))
      .catch(() => {});
  }, []);
  return templates.filter(speaks(locale));
}

import { useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ProgramDay } from "@/db";
import { supabase } from "./supabase";
import type { PlanLocale, ProgramGoal, ProgramLevel, ProgramTemplate } from "./programTemplates";

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
  /** Absent until migration 098 is applied. */
  category?: string | null;
  for_injury?: string | null;
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
    category: r.category ?? undefined,
    forInjury: r.for_injury ?? undefined,
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
  if ("category" in t) row.category = t.category || null;
  if ("forInjury" in t) row.for_injury = t.forInjury || null;
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

/** A template as the device keeps it: what users see, without the admin's fields. */
const kept = ({ isPublished, sortOrder, ...t }: AdminTemplate): ProgramTemplate => {
  void isPublished;
  void sortOrder;
  return t;
};

let refreshing: Promise<void> | null = null;

/** After an admin's change: the device reads the catalogue again. */
export function templatesChanged(): Promise<void> {
  refreshing = null;
  return refreshTemplates();
}

/**
 * Read the published templates and keep them on the device, in place of
 * those kept before: the catalogue offered offline too. Once per opening of
 * the app at most; offline, the catalogue kept stays as it is.
 */
export function refreshTemplates(): Promise<void> {
  refreshing ??= listTemplates()
    .then((all) => {
      const published = all.filter((t) => t.isPublished).map(kept);
      // Nothing read (not signed in yet: the server shows nothing): what the device keeps stands, read again later.
      if (!published.length) {
        refreshing = null;
        return;
      }
      return db.transaction("rw", db.programTemplates, async () => {
        await db.programTemplates.clear();
        await db.programTemplates.bulkPut(published);
      });
    })
    .catch(() => {
      // Offline or not signed in: what the device keeps stands; try again on the next call.
      refreshing = null;
    });
  return refreshing;
}

const NONE: ProgramTemplate[] = [];

/** Every ready-made program kept on the device, in every language (to know a program by its name); empty until read once. */
export function useTemplateCatalogue(): ProgramTemplate[] {
  useEffect(() => void refreshTemplates(), []);
  return useLiveQuery(() => db.programTemplates.toArray(), [], NONE) ?? NONE;
}

/** A template is offered to everyone, or only to users of its language. */
export const speaks = (locale: string) => (t: Pick<ProgramTemplate, "locale">) => !t.locale || t.locale === locale;

/** The catalogue offered to users, in their language. */
export function useProgramTemplates(): ProgramTemplate[] {
  const locale = useLocale();
  const all = useTemplateCatalogue();
  return useMemo(() => all.filter(speaks(locale)), [all, locale]);
}

/** The names of every ready-made program, in every language: a program by one of these names was added, not built. */
export function useReadyMadeNames(): Set<string> {
  const all = useTemplateCatalogue();
  return useMemo(() => new Set(all.map((t) => t.name)), [all]);
}

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { ArrowRight, Award, Bike, ChevronRight, Dumbbell, Flame, Footprints, HeartPulse, Sparkles, Waves, type LucideIcon } from "lucide-react";
import type { Program, Workout } from "@/db";
import { Link } from "@/i18n/navigation";
import { KIND_ORDER, programKind, programProgress, type ProgramKind } from "@/lib/programCards";
import type { ProgramGoal } from "@/lib/programTemplates";
import { programWeek } from "@/lib/programWeek";
import { programCategory } from "@/lib/programCategories";
import { cn } from "@/lib/utils";

const STYLE: Record<ProgramGoal, { tone: string; bar: string }> = {
  endurance: { tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", bar: "bg-emerald-500" },
  strength: { tone: "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300", bar: "bg-accent-500" },
  hypertrophy: { tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", bar: "bg-sky-500" },
  fat_loss: { tone: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300", bar: "bg-orange-500" },
  general: { tone: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300", bar: "bg-rose-500" },
};

function iconOf({ kind, sport }: ProgramKind): LucideIcon {
  if (kind === "endurance") return sport === "bike" ? Bike : sport === "swim" ? Waves : sport === "vaulting" ? Award : Footprints;
  if (kind === "fat_loss") return Flame;
  if (kind === "general") return HeartPulse;
  if (kind === "hypertrophy") return Sparkles;
  return Dumbbell;
}

/**
 * The athlete's programs on the home screen, side by side and ordered by
 * kind: how far each one is, and a tap to go on with it or discover it.
 */
export function MyPrograms({
  programs,
  workouts,
  catalogue,
  today,
  favorite,
  onContinue,
}: {
  programs: Program[];
  workouts: Pick<Workout, "date" | "title" | "programId" | "programDayIndex">[];
  catalogue: { name: string; goal: ProgramGoal }[];
  today: string;
  /** The athlete's favourite sport: its programs come first. */
  favorite?: string | null;
  onContinue: (program: Program) => void;
}) {
  const t = useTranslations("myPrograms");
  const tg = useTranslations("templates");
  const { short } = useFormat();
  const cards = useMemo(
    () =>
      programs
        .filter((p) => (p.structure ?? []).length > 0)
        .map((program) => ({
          program,
          kind: programKind(program, catalogue),
          progress: programProgress(program, workouts),
          mine: !!favorite && programCategory(program) === favorite,
        }))
        .sort(
          (a, b) =>
            Number(b.mine) - Number(a.mine) ||
            KIND_ORDER.indexOf(a.kind.kind) - KIND_ORDER.indexOf(b.kind.kind) ||
            a.program.name.localeCompare(b.program.name)
        ),
    [programs, workouts, catalogue, favorite]
  );
  if (!cards.length) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <Link href="/programs" className="flex min-h-10 items-center gap-1 text-sm font-medium text-accent-text">
          {t("seeAll")}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {cards.map(({ program, kind, progress }) => {
          const Icon = iconOf(kind);
          const style = STYLE[kind.kind];
          const week = programWeek(program, today);
          const started = progress.sessions > 0;
          const detail =
            week && !week.started
              ? t("startsOn", { date: short(program.startDate!) })
              : progress.share !== null
                ? `${Math.round(progress.share * 100)} %`
                : week
                  ? t("week", { week: week.week })
                  : t("sessions", { count: progress.sessions });
          return (
            <li key={program.id} className="t-surface w-44 shrink-0 snap-start space-y-2.5 rounded-2xl p-3.5 ring-1 ring-foreground/5">
              <div className="flex items-center gap-2">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", style.tone)}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xs text-muted-foreground">{tg(`goal_${kind.kind}`)}</span>
              </div>
              <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-tight">{program.name}</p>
              {progress.share !== null && (
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={Math.round(progress.share * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={program.name}
                >
                  <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${Math.max(4, progress.share * 100)}%` }} />
                </div>
              )}
              <p className="text-xs text-muted-foreground tabular-nums">{detail}</p>
              {started ? (
                <button
                  type="button"
                  onClick={() => onContinue(program)}
                  className="flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-text"
                >
                  {t("continue")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <Link href={`/programs/${program.id}`} className="flex min-h-10 items-center gap-1 text-sm font-medium text-muted-foreground">
                  {t("discover")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

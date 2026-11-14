"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Award, Bike, BicepsFlexed, Check, ChevronRight, ClipboardList, Dumbbell, Flame, Footprints, Home, Loader2, PersonStanding, Plus, Timer, Waves, Zap,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CATEGORY_ORDER, planWeeks, shelves, type ProgramCategory } from "@/lib/programCategories";
import type { ProgramLevel, ProgramTemplate } from "@/lib/programTemplates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Icon and colours of each shelf, shared with the list of one's own programs. */
export const CATEGORY_STYLE: Record<ProgramCategory | "timed" | "mobility" | "custom", { icon: LucideIcon; tone: string }> = {
  bodybuilding: { icon: Dumbbell, tone: "from-violet-100 to-violet-200 text-violet-700 dark:from-violet-900/50 dark:to-violet-950/60 dark:text-violet-300" },
  strength: { icon: BicepsFlexed, tone: "from-indigo-100 to-indigo-200 text-indigo-700 dark:from-indigo-900/50 dark:to-indigo-950/60 dark:text-indigo-300" },
  fitness: { icon: Flame, tone: "from-orange-100 to-orange-200 text-orange-700 dark:from-orange-900/50 dark:to-orange-950/60 dark:text-orange-300" },
  running: { icon: Footprints, tone: "from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/50 dark:to-emerald-950/60 dark:text-emerald-300" },
  swimming: { icon: Waves, tone: "from-sky-100 to-sky-200 text-sky-700 dark:from-sky-900/50 dark:to-sky-950/60 dark:text-sky-300" },
  cycling: { icon: Bike, tone: "from-lime-100 to-lime-200 text-lime-700 dark:from-lime-900/50 dark:to-lime-950/60 dark:text-lime-300" },
  vaulting: { icon: Award, tone: "from-fuchsia-100 to-fuchsia-200 text-fuchsia-700 dark:from-fuchsia-900/50 dark:to-fuchsia-950/60 dark:text-fuchsia-300" },
  callisthenics: { icon: Zap, tone: "from-orange-100 to-orange-200 text-orange-700 dark:from-orange-900/50 dark:to-orange-950/60 dark:text-orange-300" },
  timed: { icon: Timer, tone: "from-rose-100 to-rose-200 text-rose-700 dark:from-rose-900/50 dark:to-rose-950/60 dark:text-rose-300" },
  mobility: { icon: PersonStanding, tone: "from-teal-100 to-teal-200 text-teal-700 dark:from-teal-900/50 dark:to-teal-950/60 dark:text-teal-300" },
  custom: { icon: ClipboardList, tone: "from-card to-muted text-muted-foreground" },
};

/** The coloured square with the icon of a shelf. */
export function CategoryIcon({ category, size = "md" }: { category: keyof typeof CATEGORY_STYLE; size?: "md" | "lg" }) {
  const { icon: Icon, tone } = CATEGORY_STYLE[category];
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br", tone, size === "lg" ? "size-12" : "size-11")}>
      <Icon className={size === "lg" ? "size-6" : "size-5"} aria-hidden="true" />
    </span>
  );
}

const isMine = (tile: string, favorite?: string | null) => !!favorite && tile === favorite;

function Tile({
  category,
  label,
  detail,
  onClick,
  href,
  mine,
}: {
  category: keyof typeof CATEGORY_STYLE;
  label: string;
  detail: string;
  onClick?: () => void;
  href?: string;
  mine?: boolean;
}) {
  const t = useTranslations("catalog");
  const body = (
    <>
      <span className="flex w-full items-start justify-between gap-2">
        <CategoryIcon category={category} size="lg" />
        {mine && <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[0.7rem] font-semibold text-white">{t("mySport")}</span>}
      </span>
      <span className="mt-auto flex w-full items-end justify-between gap-1">
        <span className="block">
          <span className="block font-semibold leading-tight">{label}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </span>
    </>
  );
  const className = cn("t-surface flex min-h-32 flex-col items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-foreground/5 transition-transform active:scale-[0.98]", mine && "ring-2 ring-accent-500");
  return href ? (
    <Link href={href} className={className}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>{body}</button>
  );
}

/**
 * The ready-made programs on shelves: one tile per kind of training, then the
 * warm-ups, which are generated rather than chosen. The callisthenics shelf
 * also leads to the timed sessions, generated on the spot.
 * A tile opens its programs, the athlete's level first; each is added to
 * one's programs in a tap, or opened when it already is.
 */
export function ProgramCatalog({
  templates,
  level,
  busy,
  onUse,
  favorite,
  added,
}: {
  templates: ProgramTemplate[];
  level?: string;
  /** The athlete's favourite sport: its tile comes first. */
  favorite?: string | null;
  busy: boolean;
  onUse: (template: ProgramTemplate) => void;
  /** The id of one's program that is this ready-made one, if any. */
  added?: (template: ProgramTemplate) => number | undefined;
}) {
  const t = useTranslations("catalog");
  const tt = useTranslations("templates");
  const [open, setOpen] = useState<ProgramCategory | null>(null);
  const [filter, setFilter] = useState<ProgramLevel | null>(null);
  const byShelf = useMemo(() => shelves(templates, level), [templates, level]);
  // The favourite sport's tile first, the others in their usual order.
  const tiles = [
    ...CATEGORY_ORDER.filter((c) => (byShelf.get(c)?.length ?? 0) > 0),
    "mobility" as const,
  ].sort((a, b) => Number(isMine(b, favorite)) - Number(isMine(a, favorite)));
  const shown = open ? (byShelf.get(open) ?? []).filter((tpl) => !filter || tpl.level === filter) : [];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("howToAdd")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((c) =>
          c === "mobility" ? (
            <Tile key={c} category="mobility" label={t("cat_mobility")} detail={t("mobilityHint")} href="/mobility" />
          ) : (
            <Tile
              key={c}
              category={c}
              label={t(`cat_${c}`)}
              detail={t("count", { count: byShelf.get(c)!.length })}
              mine={favorite === c}
              onClick={() => {
                setFilter(null);
                setOpen(c);
              }}
            />
          )
        )}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <CategoryIcon category={open} />
                  {t(`cat_${open}`)}
                </DialogTitle>
              </DialogHeader>
              {open === "callisthenics" && (
                <Link href="/intervals" className="t-surface flex items-center gap-3 rounded-2xl p-3 ring-1 ring-foreground/5">
                  <CategoryIcon category="timed" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-tight">{t("timedTitle")}</span>
                    <span className="block text-xs text-muted-foreground">{t("timedText")}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              )}
              <div className="flex flex-wrap gap-2">
                <Choice on={filter === null} onClick={() => setFilter(null)}>{t("allLevels")}</Choice>
                {(["beginner", "intermediate", "advanced"] as ProgramLevel[])
                  .filter((l) => byShelf.get(open)!.some((tpl) => tpl.level === l))
                  .map((l) => (
                    <Choice key={l} on={filter === l} onClick={() => setFilter(l)}>{tt(`level_${l}`)}</Choice>
                  ))}
              </div>
              <ul className="space-y-2">
                {shown.map((tpl) => {
                  const weeks = planWeeks(tpl.structure);
                  return (
                    <li key={tpl.id} className="t-surface space-y-2 rounded-2xl p-3 ring-1 ring-foreground/5">
                      <p className="font-semibold leading-tight">{tpl.name}</p>
                      <p className="text-sm text-muted-foreground">{tpl.description}</p>
                      <div className="flex flex-wrap gap-1">
                        <Tag>{tt(`level_${tpl.level}`)}</Tag>
                        <Tag>{t("perWeek", { count: tpl.daysPerWeek })}</Tag>
                        {weeks && <Tag>{t("weeks", { count: weeks })}</Tag>}
                        {tpl.homeFriendly && (
                          <Tag>
                            <Home className="mr-1 inline h-3 w-3" aria-hidden="true" />
                            {t("home")}
                          </Tag>
                        )}
                      </div>
                      {added?.(tpl) !== undefined ? (
                        <Link
                          href={`/programs/${added(tpl)}`}
                          className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-muted text-sm font-medium"
                        >
                          <Check className="h-4 w-4 text-accent-text" aria-hidden="true" />
                          {t("alreadyAdded")}
                        </Link>
                      ) : (
                        <Button size="sm" className="w-full" onClick={() => onUse(tpl)} disabled={busy}>
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <>
                              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                              {tt("use")}
                            </>
                          )}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{children}</span>;
}

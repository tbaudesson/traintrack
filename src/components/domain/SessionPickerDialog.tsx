"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Activity, ClipboardList, Dumbbell, Footprints, PersonStanding, Plus, RotateCcw, Timer, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { sessionHref } from "@/lib/routes";
import { daysToOffer } from "@/lib/startWorkout";
import { describeTarget } from "@/lib/cardio";
import { createProgram } from "@/hooks/usePrograms";
import type { ProgramLevel, ProgramTemplate } from "@/lib/programTemplates";
import type { ActivityKind } from "@/lib/activityProfile";
import { useFormat } from "@/lib/format";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { search } from "@/lib/search";
import { byUse, lastUsed } from "@/lib/reuse";
import { practisedShelves } from "@/lib/suggest";
import { CATEGORY_ORDER, onShelf, planWeeks, programCategory, type ProgramCategory } from "@/lib/programCategories";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow, SearchField } from "@/components/ui/find";
import { CategoryIcon } from "@/components/domain/ProgramCatalog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetailRow } from "@/components/ui/detail-row";
import { GpxImport } from "@/components/domain/GpxImport";
import type { useStartActions } from "@/hooks/useStartActions";
import type { Program, ProgramDay, Workout } from "@/db";
import { useLevelName } from "@/hooks/useLevels";
import { LEVELS } from "@/lib/levels";
import { useTemplateCatalogue } from "@/lib/templateService";

/** How a day of a program is told in a list: its cardio target, or its number of exercises. */
export function useDayDetail() {
  const t = useTranslations("home");
  return (day: ProgramDay) => (day.cardio ? describeTarget(day.cardio) : t("exerciseCount", { count: day.exercises.length }));
}

/** Ready-made programs shown at once; more on demand. */
const PAGE = 6;

/**
 * "Choose a session": a day of one's programs, the last session again, a
 * session without a program (those of one's sports first), a GPX file, a new
 * program, a ready-made one. One's programs and the ready-made ones are
 * narrowed by sport, the sport followed at first (changed in the header, the
 * picker follows); one search reaches everything, whatever the sport. The
 * ready-made programs are also narrowed by level and shown a few at a time.
 */
export function SessionPickerDialog({
  open,
  onOpenChange,
  programs,
  templates,
  workouts,
  today,
  actions,
  activity,
  allSports,
  runner,
  onEndurance,
  favorite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The programs with days, to start one of them. */
  programs: Program[];
  /** The ready-made programs not added yet. */
  templates: ProgramTemplate[];
  workouts: Workout[];
  today: string;
  actions: ReturnType<typeof useStartActions>;
  /** The kind of sport practised: its sessions come first. */
  activity: ActivityKind;
  allSports: boolean;
  /** A runner: the guided running intervals are offered. */
  runner: boolean;
  /** An endurance outing: the sport is picked elsewhere. */
  onEndurance: () => void;
  /** The favourite sport: its ready-made programs are shown first. */
  favorite?: string | null;
}) {
  const t = useTranslations("home");
  const tc = useTranslations("cardio");
  const ti = useTranslations("intervals");
  const tmo = useTranslations("mobility");
  const tp = useTranslations("programs");
  const router = useRouter();
  const { day } = useFormat();
  const { hasFeature } = useFeatureAccess();
  const dayDetail = useDayDetail();
  const tcat = useTranslations("catalog");
  const levelName = useLevelName();
  const tf = useTranslations("picker");
  const pickerTop = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const weekdayName = (date: string) => new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(`${date}T12:00:00`));
  const { starting, repeatable, likeLastWeek, startDay, startFree, repeatLast, repeat } = actions;
  const level = useAthleteProfileOrNull()?.fitnessLevel;
  const [query, setQuery] = useState("");
  // The sport chosen here, for the sport followed when it was chosen: following
  // another sport (from the header) brings the picker back to that one.
  const followed = allSports ? "all" : favorite ?? null;
  const [choice, setChoice] = useState<{ followed: string | null; sport: ProgramCategory | "all" } | null>(null);
  const sport = choice?.followed === followed ? choice.sport : null;
  const [onlyLevel, setOnlyLevel] = useState<ProgramLevel | null>(null);
  const [shown, setShown] = useState(PAGE);

  const freeRows = [
    { key: "free", rank: allSports ? 0 : activity === "strength" ? 0 : 3, text: [t("freeSession"), t("freeSessionHint")], node: <DetailRow key="free" onClick={startFree} disabled={starting} icon={Plus} tone="neutral" title={t("freeSession")} subtitle={t("freeSessionHint")} /> },
    { key: "intervals", rank: allSports ? 1 : activity === "bodyweight" ? 0 : 4, text: [ti("title"), ti("hint")], node: <DetailRow key="intervals" href="/intervals" icon={Timer} tone="neutral" title={ti("title")} subtitle={ti("hint")} /> },
    ...(runner && hasFeature("running") ? [{ key: "running", rank: 1, text: [t("runIntervals"), t("runIntervalsHint")], node: <DetailRow key="running" href="/running" icon={Footprints} tone="neutral" title={t("runIntervals")} subtitle={t("runIntervalsHint")} /> }] : []),
    { key: "mobility", rank: allSports ? 2 : 5, text: [tmo("title"), tmo("hint")], node: <DetailRow key="mobility" href="/mobility" icon={PersonStanding} tone="neutral" title={tmo("title")} subtitle={tmo("hint")} /> },
    {
      key: "endurance",
      rank: allSports ? 3 : activity === "endurance" || activity === "vaulting" ? 0 : 2,
      text: [tc("newSession"), tc("newSessionHint")],
      node: <DetailRow key="endurance" onClick={() => { onOpenChange(false); onEndurance(); }} disabled={starting} icon={Activity} tone="neutral" title={tc("newSession")} subtitle={tc("newSessionHint")} />,
    },
  ].sort((a, b) => a.rank - b.rank);

  // Every ready-made program and each of one's programs with its shelf, then
  // narrowed by the search, the sport and the level.
  const withShelf = useMemo(() => templates.map((tpl) => ({ tpl, shelf: programCategory(tpl) })), [templates]);
  // One's programs are known by the whole catalogue: `templates` leaves out those already added.
  const allTemplates = useTemplateCatalogue();
  const programShelf = useMemo(() => new Map(programs.map((p) => [p, programCategory(p, allTemplates)])), [programs, allTemplates]);
  const sports = CATEGORY_ORDER.filter((c) => withShelf.some((x) => x.shelf === c) || [...programShelf.values()].includes(c));
  const ownSport = allSports ? null : sports.find((c) => c === favorite) ?? null;
  // One's sport first, then those one trains on most, then the others.
  const practised = practisedShelves(workouts, (id) => {
    const p = programs.find((x) => x.id === id);
    return p ? programShelf.get(p) ?? null : null;
  });
  const rank = (c: ProgramCategory) => (c === ownSport ? -2 : practised.includes(c) ? practised.indexOf(c) - practised.length - 2 : CATEGORY_ORDER.indexOf(c));
  const shelf = sport ?? ownSport ?? "all";
  const q = query.trim();
  const ofShelf = withShelf.filter((x) => q || shelf === "all" || x.shelf === shelf);
  const ofLevel = ofShelf.filter((x) => !onlyLevel || x.tpl.level === onlyLevel);
  const found = search(
    // The athlete's level first, the order of the catalogue kept otherwise.
    [...ofLevel].sort((a, b) => Number(b.tpl.level === level) - Number(a.tpl.level === level)),
    q,
    (x) => ({ names: [x.tpl.name], others: [x.tpl.description, x.shelf ? tcat(`cat_${x.shelf}`) : null, levelName(x.tpl.level)] })
  );
  const levels = LEVELS.filter((l) => ofShelf.some((x) => x.tpl.level === l));
  const pick = (next: ProgramCategory | "all") => {
    setChoice({ followed, sport: next });
    setOnlyLevel(null);
    setShown(PAGE);
  };

  // The days of one's programs and the sessions without a program, narrowed by the same search.
  // Favourites first, then the last used.
  // A program of another sport waits under "All" (one without a known sport, see onShelf).
  const ofSport = (p: Program) => !!q || shelf === "all" || onShelf(p, programShelf.get(p) ?? null, shelf);
  const ordered = byUse(programs, lastUsed(workouts)).filter(ofSport);
  const otherSports = programs.length - ordered.length;
  const days = ordered.flatMap((p) => daysToOffer(p, workouts, today).map(({ day: d, index }) => ({ p, d, index })));
  const foundDays = search(days, q, ({ p, d }) => ({ names: [d.name, p.name], others: [dayDetail(d)] }));
  const foundFree = search(freeRows, q, (r) => ({ names: [r.text[0]], others: [r.text[1]] }));
  const showRepeat = !!repeatable && (!q || search([repeatable], q, (w) => ({ names: [t("repeatLast"), w.title] })).length > 0);
  const showLike = !!likeLastWeek && (!q || search([likeLastWeek], q, (w) => ({ names: [tf("likeLastWeek", { day: weekdayName(w.date) }), w.title] })).length > 0);
  const nothing = q && !foundDays.length && !foundFree.length && !found.length && !showRepeat && !showLike;
  const describe = (tpl: ProgramTemplate, shelfOf: ProgramCategory | null) => {
    const weeks = planWeeks(tpl.structure);
    const length = weeks ? t("readyMadeWeeks", { count: weeks }) : t("readyMadeDays", { count: tpl.structure.length });
    return [shelfOf ? tcat(`cat_${shelfOf}`) : null, levelName(tpl.level), length].filter(Boolean).join(" · ");
  };

  async function buildProgram() {
    onOpenChange(false);
    const id = await createProgram({ name: tp("untitled"), structure: [{ name: `${tp("day")} 1`, exercises: [] }] });
    router.push(`/programs/${id}`);
  }

  // Stays in the picker: the program joins the list above, ready to start.
  async function addTemplate(template: ProgramTemplate) {
    await createProgram({ name: template.name, description: template.description, structure: template.structure });
    pickerTop.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("chooseSession")}</DialogTitle>
        </DialogHeader>
        <div ref={pickerTop} className="space-y-4">
          <SearchField
            value={query}
            onChange={(v) => {
              setQuery(v);
              setShown(PAGE);
            }}
            placeholder={tf("searchProgram")}
            clearLabel={tf("clear")}
          />

          {/* The sport: one's programs and the ready-made ones; the search looks everywhere. */}
          {!q && sports.length > 1 && (
            <ChipRow label={tf("sport")}>
              <Chip on={shelf === "all"} onClick={() => pick("all")}>{tf("all")}</Chip>
              {[...sports].sort((a, b) => rank(a) - rank(b)).map((c) => (
                <Chip key={c} on={shelf === c} onClick={() => pick(c)}>{tcat(`cat_${c}`)}</Chip>
              ))}
            </ChipRow>
          )}

          {foundDays.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("myPrograms")}</h3>
              {ordered
                .filter((p) => foundDays.some((x) => x.p === p))
                .map((p) => (
                  <div key={p.id} className="space-y-2">
                    <h4 className="text-sm font-semibold">{p.name}</h4>
                    {foundDays
                      .filter((x) => x.p === p)
                      .map(({ d, index }) => (
                        <DetailRow
                          key={`${p.id}-${index}`}
                          onClick={() => startDay(p, index)}
                          disabled={starting}
                          icon={d.cardio ? Activity : Dumbbell}
                          title={d.name}
                          subtitle={dayDetail(d)}
                        />
                      ))}
                  </div>
                ))}
            </section>
          )}

          {/* One's programs of other sports, one tap away. */}
          {!q && otherSports > 0 && (
            <button type="button" onClick={() => pick("all")} className="flex min-h-10 w-full items-center justify-center text-sm font-medium text-accent-text">
              {tf("otherSports", { count: otherSports })}
            </button>
          )}

          {(showRepeat || showLike || foundFree.length > 0 || !q) && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("noProgram")}</h3>
              {showLike && likeLastWeek && (
                <DetailRow
                  onClick={() => repeat(likeLastWeek)}
                  disabled={starting}
                  icon={RotateCcw}
                  tone="neutral"
                  title={tf("likeLastWeek", { day: weekdayName(likeLastWeek.date) })}
                  subtitle={`${likeLastWeek.title || t("freeSession")} · ${day(likeLastWeek.date)}`}
                />
              )}
              {showRepeat && repeatable && (
                <DetailRow
                  onClick={repeatLast}
                  disabled={starting}
                  icon={RotateCcw}
                  tone="neutral"
                  title={t("repeatLast")}
                  subtitle={`${repeatable.title || t("freeSession")} · ${day(repeatable.date)}`}
                />
              )}
              {[...foundFree].sort((a, b) => (q ? 0 : a.rank - b.rank)).map((row) => row.node)}
              {!q && (
                <GpxImport
                  existing={workouts}
                  onImported={({ workoutId }) => {
                    onOpenChange(false);
                    router.push(sessionHref(workoutId));
                  }}
                  trigger={(openImport) => (
                    <DetailRow onClick={openImport} icon={Upload} tone="neutral" title={tc("importGpx")} subtitle={tc("importGpxHint")} />
                  )}
                />
              )}
            </section>
          )}

          {!q && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("addProgram")}</h3>
              <DetailRow onClick={buildProgram} icon={Plus} title={t("buildProgram")} subtitle={t("buildProgramHint")} />
              <DetailRow href="/programs" icon={ClipboardList} tone="neutral" title={t("managePrograms")} subtitle={t("manageProgramsHint")} />
            </section>
          )}

          {templates.length > 0 && (found.length > 0 || !q) && (
            <section className="space-y-2" aria-labelledby="picker-ready-made">
              <h3 id="picker-ready-made" className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("readyMade")}</h3>
              {!q && levels.length > 1 && (
                <ChipRow label={tf("level")}>
                  <Chip on={!onlyLevel} onClick={() => { setOnlyLevel(null); setShown(PAGE); }}>{tf("allLevels")}</Chip>
                  {levels.map((l) => (
                    <Chip key={l} on={onlyLevel === l} onClick={() => { setOnlyLevel(onlyLevel === l ? null : l); setShown(PAGE); }}>{levelName(l)}</Chip>
                  ))}
                </ChipRow>
              )}
              {found.slice(0, shown).map(({ tpl, shelf: c }) => (
                <DetailRow
                  key={tpl.id}
                  onClick={() => addTemplate(tpl)}
                  leading={<CategoryIcon category={c ?? "custom"} />}
                  title={tpl.name}
                  subtitle={describe(tpl, c)}
                />
              ))}
              {found.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">{tf("none")}</p>}
              {found.length > shown && (
                <Button variant="ghost" className="w-full text-accent-text" onClick={() => setShown(shown + PAGE * 2)}>
                  {tf("more", { count: found.length - shown })}
                </Button>
              )}
            </section>
          )}

          {nothing && (
            <div className="space-y-2 py-6 text-center text-sm text-muted-foreground">
              <p>{tf("none")}</p>
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>{tf("reset")}</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

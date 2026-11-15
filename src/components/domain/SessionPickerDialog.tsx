"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Activity, ClipboardList, Dumbbell, Footprints, PersonStanding, Plus, RotateCcw, Sparkles, Timer, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { sessionHref } from "@/lib/routes";
import { daysToOffer } from "@/lib/startWorkout";
import { describeTarget } from "@/lib/cardio";
import { createProgram } from "@/hooks/usePrograms";
import type { ProgramTemplate } from "@/lib/programTemplates";
import type { ActivityKind } from "@/lib/activityProfile";
import { useFormat } from "@/lib/format";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetailRow } from "@/components/ui/detail-row";
import { GpxImport } from "@/components/domain/GpxImport";
import type { useStartActions } from "@/hooks/useStartActions";
import type { Program, ProgramDay, Workout } from "@/db";

/** How a day of a program is told in a list: its cardio target, or its number of exercises. */
export function useDayDetail() {
  const t = useTranslations("home");
  return (day: ProgramDay) => (day.cardio ? describeTarget(day.cardio) : t("exerciseCount", { count: day.exercises.length }));
}

/**
 * "Choose a session": a day of one's programs, the last session again, a
 * session without a program (those of one's sports first), a GPX file, a new
 * program, a ready-made one.
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
  const pickerTop = useRef<HTMLDivElement>(null);
  const { starting, repeatable, startDay, startFree, repeatLast } = actions;

  const freeRows = [
    { key: "free", rank: allSports ? 0 : activity === "strength" ? 0 : 3, node: <DetailRow key="free" onClick={startFree} disabled={starting} icon={Plus} tone="neutral" title={t("freeSession")} subtitle={t("freeSessionHint")} /> },
    { key: "intervals", rank: allSports ? 1 : activity === "bodyweight" ? 0 : 4, node: <DetailRow key="intervals" href="/intervals" icon={Timer} tone="neutral" title={ti("title")} subtitle={ti("hint")} /> },
    ...(runner && hasFeature("running") ? [{ key: "running", rank: 1, node: <DetailRow key="running" href="/running" icon={Footprints} tone="neutral" title={t("runIntervals")} subtitle={t("runIntervalsHint")} /> }] : []),
    { key: "mobility", rank: allSports ? 2 : 5, node: <DetailRow key="mobility" href="/mobility" icon={PersonStanding} tone="neutral" title={tmo("title")} subtitle={tmo("hint")} /> },
    {
      key: "endurance",
      rank: allSports ? 3 : activity === "endurance" || activity === "vaulting" ? 0 : 2,
      node: <DetailRow key="endurance" onClick={() => { onOpenChange(false); onEndurance(); }} disabled={starting} icon={Activity} tone="neutral" title={tc("newSession")} subtitle={tc("newSessionHint")} />,
    },
  ].sort((a, b) => a.rank - b.rank);

  const templateGroups = (
    [
      { key: "readyMadeStrength", items: templates.filter((x) => x.goal !== "endurance") },
      { key: "readyMadeEndurance", items: templates.filter((x) => x.goal === "endurance") },
    ] as const
  ).filter((group) => group.items.length > 0);

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
          {programs.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("myPrograms")}</h3>
              {programs.map((p) => (
                <div key={p.id} className="space-y-2">
                  <h4 className="text-sm font-semibold">{p.name}</h4>
                  {daysToOffer(p, workouts, today).map(({ day: d, index }) => (
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

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("noProgram")}</h3>
            {repeatable && (
              <DetailRow
                onClick={repeatLast}
                disabled={starting}
                icon={RotateCcw}
                tone="neutral"
                title={t("repeatLast")}
                subtitle={`${repeatable.title || t("freeSession")} · ${day(repeatable.date)}`}
              />
            )}
            {freeRows.map((row) => row.node)}
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
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("addProgram")}</h3>
            <DetailRow onClick={buildProgram} icon={Plus} title={t("buildProgram")} subtitle={t("buildProgramHint")} />
            <DetailRow href="/programs" icon={ClipboardList} tone="neutral" title={t("managePrograms")} subtitle={t("manageProgramsHint")} />
          </section>

          {templateGroups.map(({ key, items }) => (
            <section key={key} className="space-y-2">
              <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t(key)}</h3>
              {items.map((template) => (
                <DetailRow
                  key={template.id}
                  onClick={() => addTemplate(template)}
                  icon={key === "readyMadeEndurance" ? Activity : Sparkles}
                  title={template.name}
                  subtitle={
                    template.structure.some((d) => d.week !== undefined)
                      ? t("readyMadeWeeks", { count: new Set(template.structure.map((d) => d.week)).size })
                      : t("readyMadeDays", { count: template.structure.length })
                  }
                />
              ))}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

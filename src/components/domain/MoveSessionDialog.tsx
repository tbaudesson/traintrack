"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Undo2 } from "lucide-react";
import type { Program, ScheduleMove, Workout } from "@/db";
import { updateTrainingSchedule } from "@/hooks/useAthleteProfile";
import { moveTargets, withMove, withoutMove, type PlannedProgram, type ScheduledSession } from "@/lib/schedule";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const dayLabel = (locale: string, date: string) =>
  new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

/**
 * A day's sessions, each to move to another day of the week ahead, to skip,
 * or, once moved, to put back. A missed session moved to today is caught up.
 */
export function MoveSessionDialog({
  date,
  sessions,
  skipped = [],
  planned,
  moves,
  today,
  workouts,
  onClose,
}: {
  date: string | null;
  sessions: ScheduledSession[];
  /** Programs whose session of that day was skipped. */
  skipped?: Program[];
  planned: PlannedProgram[];
  moves: ScheduleMove[];
  today: string;
  workouts: Workout[];
  onClose: () => void;
}) {
  const t = useTranslations("move");
  const locale = useLocale();

  async function save(next: ScheduleMove[]) {
    await updateTrainingSchedule({ scheduleMoves: next });
    onClose();
  }

  return (
    <Dialog open={!!date} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-accent-text" aria-hidden="true" />
            {date ? t("title", { day: dayLabel(locale, date) }) : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {date &&
            sessions.map((s) => {
              const of = planned.find((p) => p.program.id === s.program.id);
              if (!of) return null;
              const program = s.program.uuid;
              const targets = moveTargets({ planned: of, date, today, workouts });
              const missed = s.status === "missed";
              return (
                <section key={`${s.program.id}-${s.index}`} className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    {missed ? s.program.name : `${s.label} · ${s.program.name}`}
                    {missed && <span className="ml-2 text-xs font-normal text-muted-foreground">{t("missed")}</span>}
                  </h3>
                  {targets.length > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground">{missed ? t("catchUp") : t("moveTo")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {targets.map((day) => (
                          <button
                            key={day}
                            data-date={day}
                            type="button"
                            onClick={() => save(withMove(moves, { program, from: date, to: day }, today))}
                            className="min-h-10 rounded-lg bg-muted px-3 text-sm font-medium capitalize hover:bg-accent-500/15"
                          >
                            {day === today ? t("today") : dayLabel(locale, day)}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("noDay")}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {s.movedFrom && (
                      <Button variant="outline" size="sm" onClick={() => save(withoutMove(moves, program, date))}>
                        <Undo2 className="mr-1 h-4 w-4" aria-hidden="true" />
                        {t("back", { day: dayLabel(locale, s.movedFrom) })}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => save(withMove(moves, { program, from: date, to: null }, today))}>
                      {missed ? t("letGo") : t("skip")}
                    </Button>
                  </div>
                </section>
              );
            })}
          {date &&
            skipped.map((p) => (
              <section key={`skipped-${p.id}`} className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {p.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{t("skipped")}</span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => save(moves.filter((m) => !(m.program === p.uuid && m.from === date && m.to === null)))}
                >
                  <Undo2 className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t("unskip")}
                </Button>
              </section>
            ))}
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

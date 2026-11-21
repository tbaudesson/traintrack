"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, Calendar, Dumbbell } from "lucide-react";
import type { ProgramDay } from "@/db";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { usePrograms } from "@/hooks/usePrograms";
import { useFormat } from "@/lib/format";
import { dayFromWorkout } from "@/lib/reuse";
import { search } from "@/lib/search";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { Chip, ChipRow, SearchField } from "@/components/ui/find";

const PAGE = 15;

/**
 * A session to add to a program without typing it again: one done (its
 * exercises, sets, reps and rest as done), or a day of another of one's
 * programs. Searched by name, date or program, the latest first.
 */
export function ExistingSessionPicker({ open, onOpenChange, onPick, exceptProgramId }: { open: boolean; onOpenChange: (open: boolean) => void; onPick: (day: ProgramDay) => void; exceptProgramId?: number }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden">
        {open && <Body onPick={onPick} exceptProgramId={exceptProgramId} />}
      </DialogContent>
    </Dialog>
  );
}

type Item = { key: string; kind: "done" | "day"; title: string; subtitle: string; search: string[]; build: () => ProgramDay | null; cardio?: boolean };

function Body({ onPick, exceptProgramId }: { onPick: (day: ProgramDay) => void; exceptProgramId?: number }) {
  const t = useTranslations("reuse");
  const tf = useTranslations("picker");
  const tw = useTranslations("log");
  const { day: dayLabel } = useFormat();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const exercises = useExercises();
  const programs = usePrograms();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "done" | "day">("all");
  const [shown, setShown] = useState(PAGE);

  const items = useMemo<Item[]>(() => {
    const withSets = new Set(sets.map((s) => s.workoutId));
    const done: Item[] = [...workouts]
      .filter((w) => w.id !== undefined && withSets.has(w.id) && w.kind !== "cardio" && w.kind !== "interval")
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((w) => {
        const title = w.title || tw("title");
        const count = new Set(sets.filter((s) => s.workoutId === w.id).map((s) => s.exerciseId)).size;
        return { key: `w${w.id}`, kind: "done", title, subtitle: `${dayLabel(w.date)} · ${t("exercises", { count })}`, search: [title, w.date, dayLabel(w.date)], build: () => dayFromWorkout(title, w.id!, sets, exercises) };
      });
    const days: Item[] = programs
      .filter((p) => p.id !== exceptProgramId)
      .flatMap((p) =>
        (p.structure ?? []).map((d, i) => ({
          key: `p${p.id}-${i}`,
          kind: "day" as const,
          title: d.name,
          subtitle: d.cardio ? p.name : `${p.name} · ${t("exercises", { count: d.exercises.length })}`,
          search: [d.name, p.name],
          cardio: !!d.cardio,
          build: () => structuredClone({ name: d.name, exercises: d.exercises, ...(d.cardio ? { cardio: d.cardio } : {}) }),
        }))
      );
    return [...done, ...days];
  }, [workouts, sets, exercises, programs, exceptProgramId, dayLabel, t, tw]);

  const found = search(
    items.filter((x) => kind === "all" || x.kind === kind),
    query,
    (x) => ({ names: [x.title], others: x.search })
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("existingTitle")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <SearchField value={query} onChange={(v) => { setQuery(v); setShown(PAGE); }} placeholder={t("searchSession")} clearLabel={tf("clear")} />
        <ChipRow label={t("kind")}>
          {(["all", "done", "day"] as const).map((k) => (
            <Chip key={k} on={kind === k} onClick={() => { setKind(k); setShown(PAGE); }}>{t(`kind_${k}`)}</Chip>
          ))}
        </ChipRow>
      </div>
      <div className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1">
        {found.slice(0, shown).map((x) => (
          <DetailRow
            key={x.key}
            onClick={() => {
              const day = x.build();
              if (day) onPick(day);
            }}
            icon={x.kind === "done" ? Calendar : x.cardio ? Activity : Dumbbell}
            tone="neutral"
            title={x.title}
            subtitle={x.subtitle}
          />
        ))}
        {!found.length && <p className="py-6 text-center text-sm text-muted-foreground">{items.length ? tf("none") : t("noSessions")}</p>}
        {found.length > shown && (
          <Button variant="ghost" className="w-full text-accent-text" onClick={() => setShown(shown + PAGE)}>
            {tf("more", { count: found.length - shown })}
          </Button>
        )}
      </div>
    </>
  );
}

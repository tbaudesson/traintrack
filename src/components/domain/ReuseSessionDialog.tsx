"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList, Plus } from "lucide-react";
import type { Exercise, WorkoutSet } from "@/db";
import { useRouter } from "@/i18n/navigation";
import { createProgram, updateProgram, useTrainablePrograms } from "@/hooks/usePrograms";
import { useAuth } from "@/contexts/AuthContext";
import { canEditProgram } from "@/lib/programOrigin";
import { useWorkouts } from "@/hooks/useWorkouts";
import { appendDay, byUse, dayFromWorkout, lastUsed } from "@/lib/reuse";
import { search } from "@/lib/search";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DetailRow } from "@/components/ui/detail-row";
import { SearchField } from "@/components/ui/find";

/**
 * A session done, kept to do again: as a new program of one session (a
 * template of one's own), or as a new day at the end of one of one's
 * programs. The exercises, sets, reps and rest come from what was done.
 */
export function ReuseSessionDialog({
  open,
  onOpenChange,
  workoutId,
  title,
  sets,
  exercises,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: number;
  title: string;
  sets: WorkoutSet[];
  exercises: Exercise[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden">
        {open && <Body onDone={() => onOpenChange(false)} workoutId={workoutId} title={title} sets={sets} exercises={exercises} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ onDone, workoutId, title, sets, exercises }: { onDone: () => void; workoutId: number; title: string; sets: WorkoutSet[]; exercises: Exercise[] }) {
  const t = useTranslations("reuse");
  const tf = useTranslations("picker");
  const router = useRouter();
  const { user } = useAuth();
  // Only one's own programs take a new day: a coach's stays as the coach made it.
  const programs = useTrainablePrograms().filter((p) => canEditProgram(p, user?.id));
  const workouts = useWorkouts();
  const [name, setName] = useState(title);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const day = useMemo(() => dayFromWorkout(name.trim() || title, workoutId, sets, exercises), [name, title, workoutId, sets, exercises]);
  const ordered = search(byUse(programs, lastUsed(workouts)), query, (p) => ({ names: [p.name], others: [p.description] }));

  async function asProgram() {
    if (!day) return;
    setBusy(true);
    const id = await createProgram({ name: day.name, structure: [day] });
    onDone();
    router.push(`/programs/${id}`);
  }

  async function intoProgram(id: number) {
    const program = programs.find((p) => p.id === id);
    if (!day || !program) return;
    setBusy(true);
    await updateProgram(id, { structure: appendDay(program.structure ?? [], day) });
    onDone();
    router.push(`/programs/${id}`);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
      </DialogHeader>
      {!day ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
          <p className="text-sm text-muted-foreground">{t("intro", { count: day.exercises.length })}</p>
          <label className="block space-y-1 text-xs text-muted-foreground">
            <span>{t("name")}</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </label>
          <DetailRow onClick={asProgram} disabled={busy} icon={Plus} title={t("asProgram")} subtitle={t("asProgramHint")} />
          {programs.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("intoProgram")}</h3>
              {programs.length > 5 && <SearchField value={query} onChange={setQuery} placeholder={t("searchProgram")} clearLabel={tf("clear")} />}
              {ordered.map((p) => (
                <DetailRow
                  key={p.id}
                  onClick={() => p.id && intoProgram(p.id)}
                  disabled={busy}
                  icon={ClipboardList}
                  tone="neutral"
                  title={p.name}
                  subtitle={t("days", { count: p.structure?.length ?? 0 })}
                />
              ))}
              {!ordered.length && <p className="py-2 text-center text-sm text-muted-foreground">{tf("none")}</p>}
            </section>
          )}
        </div>
      )}
    </>
  );
}

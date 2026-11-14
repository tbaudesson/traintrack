"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play, Timer } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAthleteProfileOrNull, updateTrainingSchedule } from "@/hooks/useAthleteProfile";
import { createWorkout, updateWorkout } from "@/hooks/useWorkouts";
import { useRunVma } from "@/hooks/useRunVma";
import { unlockAudio } from "@/lib/beep";
import { formatDuration } from "@/lib/cardio";
import { localDate } from "@/lib/dates";
import { useFormat } from "@/lib/format";
import { sessionHref } from "@/lib/routes";
import { vmaFromHalfCooper } from "@/lib/runPaces";
import { RUN_LEVELS, RUN_WORKOUTS, runLevelOf, runTotals, timedBlocks, type RunLevel, type RunWorkout, type TimedRunBlock } from "@/lib/runWorkouts";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RunPacesCard } from "@/components/domain/RunPacesCard";
import type { IntervalResult } from "@/components/domain/IntervalPlayer";
import { RunGuide, runSummary, useRunWords } from "@/components/domain/RunGuide";

/**
 * Running: one's paces, and interval sessions to run on their own, played
 * block by block with the voice, each effort at one's own pace.
 */
export default function RunningPage() {
  const t = useTranslations("running");
  const router = useRouter();
  const { num } = useFormat();
  const profile = useAthleteProfileOrNull();
  const { vma } = useRunVma();
  const [chosen, setChosen] = useState<RunLevel | null>(null);
  const level = chosen ?? runLevelOf(profile?.fitnessLevel);
  const [playing, setPlaying] = useState<{ workout: RunWorkout; blocks: TimedRunBlock[] } | null>(null);
  const [testWorkout, setTestWorkout] = useState<number | null>(null);
  const [meters, setMeters] = useState("");
  const testVma = vmaFromHalfCooper(Number(meters.replace(",", ".")) || 0);

  const { name: blockName, pace: paceOf } = useRunWords();

  async function end(result: IntervalResult & { distanceM: number }) {
    const run = playing;
    setPlaying(null);
    if (!run || result.elapsedSec < 60) return;
    // The distance is estimated from the paces; it can be corrected on the session.
    const distanceM = result.distanceM;
    const id = await createWorkout({
      date: localDate(),
      title: t(`w_${run.workout.id}`),
      kind: "cardio",
      sport: "run",
      durationSec: result.elapsedSec,
    });
    await updateWorkout(id, { distanceM });
    if (run.workout.id === "half-cooper") setTestWorkout(id);
    else router.push(sessionHref(id));
  }

  async function saveTest() {
    if (!testVma || testWorkout === null) return;
    await updateTrainingSchedule({ runPaces: { vma: testVma, source: "test", date: localDate() } });
    const id = testWorkout;
    setTestWorkout(null);
    router.push(sessionHref(id));
  }

  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="space-y-5 p-4 pb-28">
        <RunPacesCard />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">{t("workoutsTitle")}</h2>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t("level")}>
            {RUN_LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={l === level}
                onClick={() => setChosen(l)}
                className={cn("min-h-10 rounded-xl text-sm font-semibold", l === level ? "bg-accent-600 text-white" : "bg-muted")}
              >
                {t(`level_${l}`)}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {RUN_WORKOUTS.map((w) => {
              const blocks = timedBlocks(w.blocks(level), vma);
              const total = runTotals(blocks);
              const main = blocks.filter((b) => b.kind === "work");
              return (
                <li key={w.id} className="t-surface space-y-2 rounded-2xl p-3 ring-1 ring-foreground/5">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold">
                        {t(`w_${w.id}`)}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{t(`focus_${w.focus}`)}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">{t(`d_${w.id}`)}</p>
                    </div>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">{runSummary(main, blockName)}</span>
                    {main[0] && <span className="text-muted-foreground"> · {paceOf(main[0])}</span>}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="size-3.5" aria-hidden="true" />
                      {t("totals", { time: formatDuration(total.sec), distance: num(Math.round(total.meters / 100) / 10) })}
                    </span>
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        unlockAudio();
                        setPlaying({ workout: w, blocks });
                      }}
                    >
                      <Play className="mr-1 h-4 w-4" aria-hidden="true" />
                      {t("go")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">{t("libraryHint")}</p>
        </section>
      </div>

      {playing && <RunGuide blocks={playing.workout.blocks(level)} onEnd={end} />}

      <Dialog open={testWorkout !== null} onOpenChange={(o) => !o && testWorkout !== null && router.push(sessionHref(testWorkout))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("testTitle")}</DialogTitle>
          </DialogHeader>
          <label className="block space-y-1 text-sm font-medium">
            <span>{t("testMeters")}</span>
            <Input value={meters} onChange={(e) => setMeters(e.target.value)} inputMode="numeric" placeholder="1400" />
          </label>
          <p className="min-h-5 text-sm font-semibold text-accent-text" aria-live="polite">
            {testVma ? t("result", { vma: num(testVma) }) : meters ? t("unreadable") : ""}
          </p>
          <Button className="w-full" onClick={saveTest} disabled={!testVma}>
            {t("save")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

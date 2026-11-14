"use client";

import { useTranslations } from "next-intl";
import { useRunVma } from "@/hooks/useRunVma";
import { formatDistance } from "@/lib/cardio";
import { formatPace, zonePaces } from "@/lib/runPaces";
import { runTotals, timedBlocks, type RunBlock, type TimedRunBlock } from "@/lib/runWorkouts";
import { IntervalPlayer, type IntervalResult, type PlayerStep } from "@/components/domain/IntervalPlayer";

export const formatSeconds = (sec: number) => (sec < 60 ? `${sec} s` : sec % 60 === 0 ? `${sec / 60} min` : `${Math.floor(sec / 60)} min ${sec % 60} s`);

/** How a run's blocks read: "400 m" or "10 min", and the pace to hold. */
export function useRunWords() {
  const t = useTranslations("running");
  const { vma } = useRunVma();
  const name = (b: TimedRunBlock) => (b.kind === "work" && b.byDistance ? formatDistance(b.meters, "run") : formatSeconds(b.sec));
  const pace = (b: TimedRunBlock) => {
    const [slow, fast] = zonePaces(vma, b.zone);
    return t("paceRange", { from: formatPace(slow), to: formatPace(fast) });
  };
  return { vma, name, pace };
}

/** The main set in short: "10 × 400 m", or the efforts in a row. */
export function runSummary(main: TimedRunBlock[], name: (b: TimedRunBlock) => string): string {
  const names = main.map(name);
  if (names.length === 1) return names[0];
  return names.every((n) => n === names[0]) ? `${names.length} × ${names[0]}` : names.join(" · ");
}

/**
 * A run played block by block with the voice, each effort at the athlete's
 * pace. At the end: the time spent and the distance it covered, estimated
 * from the paces.
 */
export function RunGuide({ blocks, onEnd }: { blocks: RunBlock[]; onEnd: (result: IntervalResult & { distanceM: number }) => void }) {
  const t = useTranslations("running");
  const { vma, name, pace } = useRunWords();
  const timed = timedBlocks(blocks, vma);
  const steps: PlayerStep[] = timed.map((b) => ({
    type: "work",
    exercise: { name: name(b), cue: pace(b) },
    seconds: b.sec,
    phase: t(`block_${b.kind}`) + (b.kind === "work" ? ` · ${t(`zone_${b.zone}`)}` : ""),
    easy: b.kind !== "work",
  }));
  const total = runTotals(timed);
  return (
    <IntervalPlayer
      session={{ steps }}
      onEnd={(result) => onEnd({ ...result, distanceM: Math.round((total.meters * Math.min(result.elapsedSec, total.sec)) / Math.max(1, total.sec)) })}
      labels={{ work: t("effort"), rest: t("next"), counter: (n, all) => t("counter", { n, total: all }) }}
    />
  );
}

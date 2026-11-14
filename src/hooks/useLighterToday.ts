import { useCallback, useEffect, useState } from "react";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { readinessScore, useTodayReadiness } from "@/hooks/useReadiness";
import { lighterReason, type LighterReason } from "@/lib/readinessAdjust";
import { localDate } from "@/lib/dates";
import { mondayOfDate } from "@/lib/weekPlan";
import { returnAdjust } from "@/lib/injuries";
import type { StartOptions } from "@/lib/startWorkout";

const KEY = "traintrack.keepNormal";

/**
 * Whether today's session starts lighter, and why: the deload week, or a
 * low readiness check-in. "Keep it normal" holds for today only.
 */
export function useLighterToday(): {
  lighter: boolean;
  reason: LighterReason;
  readiness: number | null;
  keptNormal: boolean;
  setKeptNormal: (keep: boolean) => void;
  /** The options to start a session with: a lighter day, and loads coming back after an injury. */
  start: StartOptions;
} {
  const today = localDate();
  const profile = useAthleteProfile();
  const checkin = useTodayReadiness();
  const readiness = checkin ? readinessScore(checkin) : null;
  const [keptNormal, setKept] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read on the client only
      setKept(window.localStorage.getItem(KEY) === today);
    } catch {
      // No storage: the choice lasts as long as the page.
    }
  }, [today]);

  const setKeptNormal = useCallback(
    (keep: boolean) => {
      setKept(keep);
      try {
        if (keep) window.localStorage.setItem(KEY, today);
        else window.localStorage.removeItem(KEY);
      } catch {
        // Ignore: the choice still holds on this page.
      }
    },
    [today]
  );

  const reason = lighterReason({ deloadWeek: profile?.deloadWeek === mondayOfDate(today), readiness, keptNormal });
  const injuries = profile?.injuryAreas ?? [];
  const loadFactor = (name: string) => returnAdjust(name, injuries, today)?.load ?? 1;
  return { lighter: reason !== null, reason, readiness, keptNormal, setKeptNormal, start: { deload: reason !== null, loadFactor } };
}

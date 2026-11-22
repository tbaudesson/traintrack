"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bandage } from "lucide-react";
import { useInjuryGuidance } from "@/hooks/useInjuryGuidance";
import { useAthleteProfile, updateTrainingSchedule } from "@/hooks/useAthleteProfile";
import { INJURY_AREAS, injuryState, returnPhases, toggleInjury } from "@/lib/injuries";
import { useFormat } from "@/lib/format";
import { localDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * The injured areas, one tap each: injured (red), then returning gradually
 * (orange), then gone. The same chips in Settings and wherever an injury is
 * declared.
 */
export function InjuryAreasPicker() {
  const tinj = useTranslations("injuries");
  const tpain = useTranslations("pain");
  const { short } = useFormat();
  const athlete = useAthleteProfile();
  const guidance = useInjuryGuidance();
  if (!athlete) return null;
  const injuries = athlete.injuryAreas ?? [];
  const today = localDate();
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {INJURY_AREAS.map((area) => {
          const injury = injuries.find((i) => i.area === area);
          const state = injuryState(guidance, injuries, area, today);
          const phase = state === "returning" ? returnPhases(guidance, [injury!], today)[0] : null;
          return (
            <button
              key={area}
              type="button"
              onClick={() => updateTrainingSchedule({ injuryAreas: toggleInjury(guidance, injuries, area, today) })}
              aria-pressed={state !== "none"}
              className={cn(
                "min-h-11 rounded-full border px-3 text-sm transition-colors",
                state === "injured"
                  ? "border-rose-500 bg-rose-500 font-semibold text-white"
                  : state === "returning"
                    ? "border-amber-500 bg-amber-500 font-semibold text-white"
                    : "border-border text-muted-foreground hover:border-rose-300"
              )}
            >
              {tpain(`area_${area}`)}
              {state === "injured" && <span className="ml-1 text-xs font-normal opacity-90">· {tinj("since", { date: short(injury!.since) })}</span>}
              {phase && <span className="ml-1 text-xs font-normal opacity-90">· {tinj("returningChip", { week: phase.week, weeks: guidance?.return.loads.length ?? phase.week })}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{tinj("stepsHint")}</p>
    </div>
  );
}

/** "Declare a pain or an injury", where it is needed (home, form, health), not only in Settings. */
export function DeclareInjuryButton({ className }: { className?: string }) {
  const tinj = useTranslations("injuries");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className={cn("w-full", className)} onClick={() => setOpen(true)}>
        <Bandage className="mr-1 h-4 w-4" aria-hidden="true" />
        {tinj("declare")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tinj("title")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{tinj("settingsHint")}</p>
          <InjuryAreasPicker />
          <Button onClick={() => setOpen(false)}>{tinj("done")}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

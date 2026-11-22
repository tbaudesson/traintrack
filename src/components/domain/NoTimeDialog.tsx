"use client";

import { useTranslations } from "next-intl";
import { CalendarClock, ChevronRight, Settings2, Timer, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PlanB } from "@/lib/planB";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** "HIIT · full body · 15 min", "Run · 20 min", "Force 3 days · Day B": a plan B in a few words. */
export function usePlanBLabel(): (p: PlanB, programs: { uuid: string; name: string; structure?: { name: string }[] }[]) => string {
  const t = useTranslations("planB");
  const ti = useTranslations("intervals");
  const tm = useTranslations("mobility");
  const tc = useTranslations("cardio");
  return (p, programs) => {
    if (p.kind === "timed") return `${t("kind_timed")} · ${ti(`focus_${p.focus}`)} · ${t("min", { m: p.minutes })}`;
    if (p.kind === "mobility") return `${tm(`mode_${p.mode}`)} · ${t("min", { m: p.minutes })}`;
    if (p.kind === "cardio") return `${tc(`sport_${p.sport}`)} · ${t("min", { m: p.minutes })}`;
    const program = programs.find((x) => x.uuid === p.programUuid);
    return program ? `${program.name} · ${program.structure?.[p.dayIndex]?.name ?? ""}` : t("kind_program");
  };
}

/**
 * No time today: the session in less time, one's plan B instead, or the
 * session on another day. Each shows only when it can be done; a plan B not
 * chosen yet leads to Settings.
 */
export function NoTimeDialog({
  open,
  onOpenChange,
  onExpress,
  planB,
  onPlanB,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpress?: () => void;
  /** One's plan B in a few words, when chosen. */
  planB?: string | null;
  onPlanB: () => void;
  onMove?: () => void;
}) {
  const t = useTranslations("planB");
  const row = "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left ring-1 ring-foreground/10 hover:bg-muted";
  const pick = (f: () => void) => () => {
    onOpenChange(false);
    f();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("noTimeTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {onExpress && (
            <button type="button" onClick={pick(onExpress)} className={row}>
              <Timer className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t("shorter")}</span>
                <span className="block text-xs text-muted-foreground">{t("shorterText")}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          )}
          {planB ? (
            <button type="button" onClick={pick(onPlanB)} className={row}>
              <Zap className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t("instead")}</span>
                <span className="block truncate text-xs text-muted-foreground">{planB}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          ) : (
            <Link href="/settings?section=planb" onClick={() => onOpenChange(false)} className={row}>
              <Settings2 className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t("choose")}</span>
                <span className="block text-xs text-muted-foreground">{t("chooseText")}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          )}
          {onMove && (
            <button type="button" onClick={pick(onMove)} className={row}>
              <CalendarClock className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t("move")}</span>
                <span className="block text-xs text-muted-foreground">{t("moveText")}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

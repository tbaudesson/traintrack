"use client";

import { useTranslations } from "next-intl";
import { Clock, Dumbbell, Gauge, Layers, Route, Trophy, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFormat } from "@/lib/format";

export interface SessionSummaryData {
  durationMin: number | null;
  sets: number;
  volume: number;
  /** Percent against the previous comparable session; null if there is none. */
  change: number | null;
  records: { exercise: string; weightKg: number; reps: number }[];
  cardio?: { distance: string | null; duration: string | null; pace: string | null; records: ("distance" | "pace")[] };
}

function Tile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="t-surface rounded-2xl p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-4 text-accent-text" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function SessionSummary({ data, onClose }: { data: SessionSummaryData | null; onClose: () => void }) {
  const t = useTranslations("log");
  const { num } = useFormat();
  const tc = useTranslations("cardio");
  if (!data) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("summaryTitle")}</DialogTitle>
        </DialogHeader>
        {data.cardio ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Tile icon={Route} label={tc("distance")} value={data.cardio.distance ?? "—"} />
              <Tile icon={Clock} label={t("summaryDuration")} value={data.cardio.duration ?? "—"} />
              {data.cardio.pace && <Tile icon={Gauge} label={tc("paceLabel")} value={data.cardio.pace} />}
            </div>
            {data.cardio.records.map((kind) => (
              <p key={kind} className="flex items-center gap-2 text-sm font-medium">
                <Trophy className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
                {tc(kind === "distance" ? "recordDistance" : "recordPace")}
              </p>
            ))}
          </>
        ) : (
        <>
        <div className="grid grid-cols-2 gap-2">
          <Tile icon={Clock} label={t("summaryDuration")} value={data.durationMin !== null ? `${data.durationMin} min` : "—"} />
          <Tile icon={Layers} label={t("summarySets")} value={String(data.sets)} />
          <Tile icon={Dumbbell} label={t("summaryVolume")} value={`${num(Math.round(data.volume), 0)} kg`} />
          <Tile icon={Trophy} label={t("summaryRecords")} value={String(data.records.length)} />
        </div>
        {data.change !== null && (
          <p className="text-sm font-medium">
            {t("summaryChange", { percent: `${data.change > 0 ? "+" : ""}${data.change}` })}
          </p>
        )}
        {data.records.length > 0 && (
          <ul className="space-y-1">
            {data.records.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Trophy className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
                {r.exercise} · {num(r.weightKg)} kg × {r.reps}
              </li>
            ))}
          </ul>
        )}
        </>
        )}
        <Button onClick={onClose} className="w-full">{t("summaryDone")}</Button>
      </DialogContent>
    </Dialog>
  );
}

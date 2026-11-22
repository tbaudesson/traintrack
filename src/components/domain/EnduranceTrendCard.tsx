"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Sport, Workout } from "@/db";
import { enduranceTrend, paceUnit, trendSports } from "@/lib/enduranceTrend";
import { useFormat } from "@/lib/format";
import { Chip, ChipRow } from "@/components/ui/find";

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * The pace of each outing, and the power of each ride, over six months: one
 * chart a measure, never two units on one axis. Faster is higher on the pace
 * chart (its scale is reversed), as one reads progress.
 */
export function EnduranceTrendCard({ workouts, today }: { workouts: Workout[]; today: string }) {
  const t = useTranslations("enduranceTrend");
  const tc = useTranslations("cardio");
  const { short } = useFormat();
  const from = addDays(today, -182);
  const sports = useMemo(() => trendSports(workouts, from, today), [workouts, from, today]);
  const [chosen, setChosen] = useState<Sport | null>(null);
  const sport = chosen && sports.includes(chosen) ? chosen : sports[0];
  const points = useMemo(() => (sport ? enduranceTrend(workouts, sport, from, today) : []), [workouts, sport, from, today]);
  if (!sport) return <p className="px-4 pb-3 text-sm text-muted-foreground">{t("empty")}</p>;
  const paces = points.filter((p) => p.pace !== null);
  const powers = points.filter((p) => p.power !== null);
  const unit = paceUnit(sport) === 100 ? "/100 m" : "/km";

  const chart = (data: typeof points, key: "pace" | "power", label: string, format: (v: number) => string, reversed: boolean) => (
    <div>
      <p className="mb-1 text-xs font-semibold">{label}</p>
      <div className="h-40 w-full" role="img" aria-label={t("chartLabel", { name: label, count: data.length })}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(120,120,120,0.15)" />
            <XAxis dataKey="date" tickFormatter={(d: string) => short(d)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis reversed={reversed} domain={["auto", "auto"]} tickFormatter={format} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              content={({ active, payload }) => {
                const row = active && payload?.[0]?.payload;
                if (!row || row[key] === null) return null;
                return <div className="rounded-lg border border-border bg-background p-2 text-xs shadow-md">{short(row.date)} · {format(row[key])}</div>;
              }}
            />
            <Line type="monotone" dataKey={key} stroke="var(--accent-500, #6d28d9)" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 px-4 pb-4">
      {sports.length > 1 && (
        <ChipRow label={t("sport")}>
          {sports.map((s) => (
            <Chip key={s} on={s === sport} onClick={() => setChosen(s)}>{tc(`sport_${s}`)}</Chip>
          ))}
        </ChipRow>
      )}
      {paces.length >= 2 && chart(paces, "pace", t("pace", { unit }), (v) => `${clock(v)}`, true)}
      {powers.length >= 2 && chart(powers, "power", t("power"), (v) => `${Math.round(v)} W`, false)}
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  );
}

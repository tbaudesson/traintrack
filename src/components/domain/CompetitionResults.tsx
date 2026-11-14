"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Medal, Pencil } from "lucide-react";
import type { CompetitionResult } from "@/db";
import { competitionSummary, finalScore } from "@/lib/competitions";
import { useFormat } from "@/lib/format";

/**
 * Competition results: the bests, the curve of each test over time, and every
 * competition with its scores and ranking. Read by the athlete, who can edit
 * them, and by their coach.
 */
export function CompetitionResults({ results, onEdit }: { results: CompetitionResult[]; onEdit?: (r: CompetitionResult) => void }) {
  const t = useTranslations("competitions");
  const { num, day } = useFormat();
  const summary = competitionSummary(results);
  const score = (n: number | null | undefined) => (typeof n === "number" ? num(n, 3) : "—");
  const data = useMemo(
    () =>
      [...results]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({ date: r.date, compulsory: r.compulsory ?? null, technical: r.technical ?? null, freestyle: r.freestyle ?? null, final: finalScore(r) })),
    [results]
  );
  const hasTechnical = results.some((r) => typeof r.technical === "number");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Best label={t("bestFinal")} value={score(summary.best.final)} />
        <Best label={t("bestCompulsory")} value={score(summary.best.compulsory)} />
        <Best label={t("bestFreestyle")} value={score(summary.best.freestyle)} />
      </div>
      {summary.progress !== null && (
        <p className="text-sm text-muted-foreground">
          {t(summary.progress >= 0 ? "progressUp" : "progressDown", { points: num(Math.abs(summary.progress), 3), count: summary.count })}
        </p>
      )}

      {data.length >= 2 && (
        <div className="t-surface h-56 rounded-2xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => day(d).slice(0, 5)} />
              <YAxis tick={{ fontSize: 10 }} width={32} domain={["auto", "auto"]} />
              <Tooltip labelFormatter={(d) => day(String(d))} formatter={(v, name) => [num(Number(v), 3), t(`test_${name}`)]} />
              <Legend formatter={(name) => t(`test_${name}`)} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="final" stroke="var(--accent-600)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="compulsory" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
              {hasTechnical && <Line type="monotone" dataKey="technical" stroke="#0ea5e9" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />}
              <Line type="monotone" dataKey="freestyle" stroke="#f97316" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.id} className="t-surface rounded-2xl p-3 ring-1 ring-foreground/5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.event}</p>
                <p className="text-xs text-muted-foreground">
                  {[day(r.date), r.category, r.horse && t("onHorse", { horse: r.horse })].filter(Boolean).join(" · ")}
                </p>
              </div>
              {r.rank && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-500/15 px-2 py-0.5 text-xs font-semibold text-accent-text">
                  <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                  {r.participants ? t("rankOf", { rank: r.rank, total: r.participants }) : t("rank", { rank: r.rank })}
                </span>
              )}
              {onEdit && (
                <button type="button" onClick={() => onEdit(r)} aria-label={t("edit")} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <dl className="mt-2 grid grid-cols-4 gap-1 text-center">
              <Score label={t("test_compulsory")} value={score(r.compulsory)} />
              <Score label={t("test_technical")} value={score(r.technical)} />
              <Score label={t("test_freestyle")} value={score(r.freestyle)} />
              <Score label={t("test_final")} value={score(finalScore(r))} strong />
            </dl>
            {r.notes && <p className="mt-2 text-sm text-muted-foreground">{r.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Best({ label, value }: { label: string; value: string }) {
  return (
    <div className="t-surface rounded-2xl p-3 text-center ring-1 ring-foreground/5">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Score({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/60 px-1 py-1.5">
      <dt className="truncate text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-bold text-accent-text tabular-nums" : "font-semibold tabular-nums"}>{value}</dd>
    </div>
  );
}

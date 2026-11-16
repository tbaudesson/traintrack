"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Apple, Flag, HeartPulse, TrendingUp, Users, Activity, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface QuickAccessData {
  /** Sessions done against the week's goal, when the program sets one. */
  week: { done: number; target: number } | null;
  /** The training load's change against the last four weeks, in %. */
  loadChange: number | null;
  /** Today's readiness score, out of 100. */
  readiness: number | null | undefined;
  /** Today's calories, when nutrition is in the licence. */
  calories: number | null | undefined;
  teams: number;
  challenges: boolean;
}

/**
 * Dynamic's "Quick access": the day's numbers in compact tiles, each leading to
 * its page. Only values the app already computes; nothing new is worked out here.
 */
export function QuickAccessTiles({ data }: { data: QuickAccessData }) {
  const t = useTranslations("home");
  const tiles: { key: string; href: string; icon: ReactNode; label: string; value: ReactNode; sub?: string; gauge?: number | undefined }[] = [
    {
      key: "week", href: "/progress", icon: <TrendingUp className="size-4" aria-hidden="true" />, label: t("tileWeek"),
      value: data.week ? `${data.week.done}/${data.week.target}` : "—", sub: data.week ? t("tileWeekUnit") : t("tileWeekNone"),
    },
    ...(data.loadChange !== null
      ? [{ key: "load", href: "/progress", icon: <Activity className="size-4" aria-hidden="true" />, label: t("tileLoad"), value: `${data.loadChange > 0 ? "+" : ""}${data.loadChange} %`, sub: t("tileLoadSub") }]
      : []),
    ...(data.readiness !== undefined
      ? [{ key: "readiness", href: "/readiness", icon: <HeartPulse className="size-4" aria-hidden="true" />, label: t("tileForm"), value: data.readiness ?? "—", sub: data.readiness == null ? t("tileFormNone") : "/ 100", gauge: data.readiness ?? undefined }]
      : []),
    ...(data.calories !== undefined
      ? [{ key: "nutrition", href: "/nutrition", icon: <Apple className="size-4" aria-hidden="true" />, label: t("tileNutrition"), value: data.calories === null ? "—" : Math.round(data.calories).toLocaleString(), sub: data.calories === null ? t("tileNutritionNone") : "kcal" }]
      : []),
    { key: "teams", href: "/teams", icon: <Users className="size-4" aria-hidden="true" />, label: t("tileTeams"), value: data.teams, sub: t("tileTeamsSub", { count: data.teams }) },
    ...(data.challenges
      ? [{ key: "challenges", href: "/challenges", icon: <Flag className="size-4" aria-hidden="true" />, label: t("tileChallenges"), value: <ChevronRight className="size-5" aria-hidden="true" />, sub: t("tileOpen") }]
      : []),
  ];

  return (
    <section aria-labelledby="quick-access" className="space-y-2.5">
      <h2 id="quick-access" className="t-quick-title text-2xl uppercase">{t("quickAccess")}</h2>
      <ul role="list" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.key}>
            <Link href={tile.href} className="t-quick-tile flex h-full min-h-[5.25rem] flex-col justify-between rounded-xl border p-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <span className="text-accent-text">{tile.icon}</span>
                {tile.label}
              </span>
              <span className="flex items-end justify-between gap-2">
                <span className="min-w-0">
                  <span className={cn("t-quick-value block text-2xl leading-none font-extrabold whitespace-nowrap tabular-nums")}>{tile.value}</span>
                  {tile.sub && <span className="mt-1 block text-xs text-muted-foreground">{tile.sub}</span>}
                </span>
                {tile.gauge !== undefined && (
                  <svg viewBox="0 0 40 22" className="h-6 w-11 shrink-0" aria-hidden="true">
                    <path d="M4 20 A16 16 0 0 1 36 20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-muted" />
                    <path d="M4 20 A16 16 0 0 1 36 20" fill="none" stroke="var(--performance)" strokeWidth="4" strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.max(0, Math.min(100, tile.gauge))} 100`} />
                  </svg>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

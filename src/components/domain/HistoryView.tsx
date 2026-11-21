"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, ChevronLeft, ChevronRight, List } from "lucide-react";
import type { Workout } from "@/db";
import { useRouter } from "@/i18n/navigation";
import { sessionHref } from "@/lib/routes";
import { isCardio, formatDistance } from "@/lib/cardio";
import { useFormat } from "@/lib/format";
import { search } from "@/lib/search";
import { byMonth, monthGrid, shiftMonth } from "@/lib/suggest";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { Chip, ChipRow, SearchField } from "@/components/ui/find";

const VIEW_KEY = "traintrack.historyView";
/** Months of the list shown at once. */
const MONTHS = 2;

/**
 * The sessions done, as a list by month (two months at a time, then more on
 * demand) or as a calendar of the month, a dot on each day trained; a search
 * by name, sport or date reaches all of them. The view chosen is remembered
 * on the device.
 */
export function HistoryView({ workouts, today }: { workouts: Workout[]; today: string }) {
  const t = useTranslations("history");
  const tl = useTranslations("log");
  const tc = useTranslations("cardio");
  const tf = useTranslations("picker");
  const locale = useLocale();
  const router = useRouter();
  const { day } = useFormat();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [query, setQuery] = useState("");
  const [months, setMonths] = useState(MONTHS);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device's storage, only on the client
      if (localStorage.getItem(VIEW_KEY) === "calendar") setView("calendar");
    } catch {
      // No storage: the list.
    }
  }, []);
  const choose = (v: "list" | "calendar") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Private window: not remembered.
    }
  };

  const subtitle = (w: Workout) =>
    [
      day(w.date),
      isCardio(w) && w.distanceM ? formatDistance(w.distanceM, w.sport) : w.kind === "interval" && w.durationMin ? `${w.durationMin} min` : w.kind === "mobility" && w.durationSec ? `${Math.max(1, Math.round(w.durationSec / 60))} min` : null,
      w.kind === "mobility" && w.mobility?.rating ? t("suppleness", { rating: w.mobility.rating }) : null,
      w.cancelledAt ? t("cancelled") : null,
      !w.cancelledAt && w.sessionRpe ? t("effort", { rpe: w.sessionRpe }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  const row = (w: Workout) => (
    <DetailRow key={w.id} onClick={() => router.push(sessionHref(w.id))} icon={Calendar} tone="neutral" title={w.title || tl("title")} subtitle={subtitle(w)} />
  );

  const found = useMemo(
    () => search(workouts, query, (w) => ({ names: [w.title], others: [w.sport ? tc(`sport_${w.sport}`) : null, w.date, day(w.date)] })),
    [workouts, query, tc, day]
  );
  const groups = useMemo(() => byMonth(found), [found]);
  const monthName = (m: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${m}-15T12:00:00`));
  const byDate = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) (map.get(w.date) ?? map.set(w.date, []).get(w.date)!).push(w);
    return map;
  }, [workouts]);
  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    // 2026-11-16 is a Monday.
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2026, 10, 16 + i, 12))));
  }, [locale]);

  return (
    <section className="space-y-3" aria-labelledby="history-title">
      <div className="flex items-center justify-between gap-2">
        <SectionHeading id="history-title">{tl("history")}</SectionHeading>
        {workouts.length > 0 && (
          <ChipRow label={t("view")}>
            <Chip on={view === "list"} onClick={() => choose("list")}>
              <List className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {t("list")}
            </Chip>
            <Chip on={view === "calendar"} onClick={() => choose("calendar")}>
              <Calendar className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {t("calendar")}
            </Chip>
          </ChipRow>
        )}
      </div>

      {workouts.length === 0 ? (
        <EmptyState icon={Calendar} title={tl("noWorkouts")} />
      ) : view === "list" ? (
        <>
          {workouts.length > 8 && <SearchField value={query} onChange={(v) => { setQuery(v); setMonths(MONTHS); }} placeholder={t("search")} clearLabel={tf("clear")} />}
          {groups.slice(0, query ? groups.length : months).map((g) => (
            <div key={g.month} className="space-y-2">
              <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {monthName(g.month)} · {t("count", { count: g.items.length })}
              </h3>
              {g.items.map(row)}
            </div>
          ))}
          {query && !found.length && (
            <div className="space-y-2 py-4 text-center text-sm text-muted-foreground">
              <p>{tf("none")}</p>
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>{tf("reset")}</Button>
            </div>
          )}
          {!query && groups.length > months && (
            <Button variant="ghost" className="w-full text-accent-text" onClick={() => setMonths(months + MONTHS)}>
              {t("olderMonths")}
            </Button>
          )}
        </>
      ) : (
        <div className="t-panel space-y-3 rounded-2xl p-3">
          <div className="flex items-center justify-between">
            <Button size="icon-sm" variant="ghost" aria-label={t("previousMonth")} onClick={() => { setMonth(shiftMonth(month, -1)); setPicked(null); }}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <p className="text-sm font-semibold capitalize" aria-live="polite">{monthName(month)}</p>
            <Button size="icon-sm" variant="ghost" aria-label={t("nextMonth")} disabled={month >= today.slice(0, 7)} onClick={() => { setMonth(shiftMonth(month, 1)); setPicked(null); }}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div role="grid" aria-label={monthName(month)} className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((d, i) => (
              <span key={i} className="text-[0.7rem] font-semibold text-muted-foreground" aria-hidden="true">{d}</span>
            ))}
            {monthGrid(month).flat().map((date, i) => {
              if (!date) return <span key={i} />;
              const done = byDate.get(date)?.length ?? 0;
              return (
                <button
                  key={date}
                  type="button"
                  disabled={!done}
                  aria-pressed={picked === date}
                  aria-label={done ? `${day(date)} · ${t("count", { count: done })}` : day(date)}
                  onClick={() => setPicked(picked === date ? null : date)}
                  className={cn(
                    "relative grid aspect-square min-h-9 place-items-center rounded-lg text-sm",
                    done ? "font-semibold hover:bg-muted" : "text-muted-foreground/60",
                    date === today && "ring-1 ring-accent-500",
                    picked === date && "bg-accent-600 text-white hover:bg-accent-600"
                  )}
                >
                  {Number(date.slice(8))}
                  {done > 0 && <span className={cn("absolute bottom-1 size-1.5 rounded-full", picked === date ? "bg-white" : "bg-accent-500")} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{t("monthCount", { count: workouts.filter((w) => w.date.startsWith(month)).length })}</p>
          {picked && <div className="space-y-2">{(byDate.get(picked) ?? []).map(row)}</div>}
        </div>
      )}
    </section>
  );
}

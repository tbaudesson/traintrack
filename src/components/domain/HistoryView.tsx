"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, CalendarRange, List } from "lucide-react";
import type { Workout, WorkoutSet } from "@/db";
import type { PlannedProgram } from "@/lib/schedule";
import { doneSessions } from "@/lib/doneSessions";
import { PlanCalendar, YearView } from "@/components/domain/PlanCalendar";
import { useRouter } from "@/i18n/navigation";
import { sessionHref } from "@/lib/routes";
import { isCardio, formatDistance } from "@/lib/cardio";
import { useFormat } from "@/lib/format";
import { search } from "@/lib/search";
import { byMonth } from "@/lib/suggest";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { Chip, ChipRow, SearchField } from "@/components/ui/find";

const VIEW_KEY = "traintrack.historyView";
/** Months of the list shown at once. */
const MONTHS = 2;

/**
 * The sessions done, as a list by month (two months at a time, then more on
 * demand), as a calendar of the month (done, planned to come, missed) or as
 * the year month by month; a search by name, sport or date reaches all of
 * them. The view chosen is remembered on the device.
 */
export function HistoryView({ workouts, sets, planned, today }: { workouts: Workout[]; sets: WorkoutSet[]; planned: PlannedProgram[]; today: string }) {
  const t = useTranslations("history");
  const tl = useTranslations("log");
  const tc = useTranslations("cardio");
  const tf = useTranslations("picker");
  const locale = useLocale();
  const router = useRouter();
  const { day } = useFormat();
  const [view, setView] = useState<"list" | "calendar" | "year">("list");
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  // On the calendar and the year: the sessions done (one opened then left is not), warm-ups and stretches included.
  const doneList = useMemo(() => [...doneSessions(workouts, sets), ...workouts.filter((w) => w.kind === "mobility" && !w.cancelledAt)], [workouts, sets]);
  const [query, setQuery] = useState("");
  const [months, setMonths] = useState(MONTHS);
  const [month, setMonth] = useState(today.slice(0, 7));

  useEffect(() => {
    try {
      // Opened from the home screen's "Full planning": the calendar, scrolled to.
      const asked = new URLSearchParams(window.location.search).get("view");
      const kept = asked ?? localStorage.getItem(VIEW_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the address and the device's storage, only on the client
      if (kept === "calendar" || kept === "year") setView(kept);
      if (asked) requestAnimationFrame(() => document.getElementById("history-title")?.scrollIntoView({ block: "start" }));
    } catch {
      // No storage: the list.
    }
  }, []);
  const choose = (v: "list" | "calendar" | "year") => {
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
            <Chip on={view === "year"} onClick={() => choose("year")}>
              <CalendarRange className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {t("year")}
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
      ) : view === "calendar" ? (
        <PlanCalendar workouts={doneList} planned={planned} today={today} month={month} onMonth={setMonth} row={row} />
      ) : (
        <YearView
          workouts={doneList}
          planned={planned}
          today={today}
          year={year}
          onYear={setYear}
          onMonth={(m) => {
            setMonth(m);
            choose("calendar");
          }}
        />
      )}
    </section>
  );
}

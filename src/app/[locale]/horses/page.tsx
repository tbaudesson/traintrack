"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Minus, PawPrint, Pencil, Plus, Trash2 } from "lucide-react";
import type { Horse } from "@/db";
import { addHorseSession, deleteHorse, deleteHorseSession, saveHorse, useHorseSessions, useHorses } from "@/hooks/useHorses";
import { MAX_CANTER_PER_SESSION_MIN, recentWeeks, sessionMinutes, type LoadStatus } from "@/lib/horseLoad";
import { localDate } from "@/lib/dates";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_BAR: Record<LoadStatus, string> = { ok: "bg-emerald-500", near: "bg-amber-500", over: "bg-rose-500" };

/**
 * The horses one lunges or rides, and the work put on them: each week's
 * minutes against the horse's limit, the canter, rest days and sessions with
 * a lot of canter — so no horse carries more than it should.
 */
export default function HorsesPage() {
  const t = useTranslations("horses");
  const horses = useHorses();
  const sessions = useHorseSessions();
  const today = localDate();
  const [editing, setEditing] = useState<Partial<Horse> | null>(null);
  const [logging, setLogging] = useState<Horse | null>(null);

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("addHorse")}
          </Button>
        }
      />
      <div className="space-y-4 p-4 pb-28">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        {horses.length === 0 ? (
          <EmptyState icon={PawPrint} title={t("empty")} />
        ) : (
          horses.map((h) => (
            <HorseCard
              key={h.id}
              horse={h}
              sessions={sessions.filter((s) => s.horseId === h.id)}
              today={today}
              onEdit={() => setEditing(h)}
              onLog={() => setLogging(h)}
            />
          ))
        )}
      </div>

      <HorseDialog horse={editing} onClose={() => setEditing(null)} />
      <SessionDialog horse={logging} today={today} onClose={() => setLogging(null)} />
    </>
  );
}

function HorseCard({
  horse,
  sessions,
  today,
  onEdit,
  onLog,
}: {
  horse: Horse;
  sessions: ReturnType<typeof useHorseSessions>;
  today: string;
  onEdit: () => void;
  onLog: () => void;
}) {
  const t = useTranslations("horses");
  const { day, short } = useFormat();
  const weeks = recentWeeks(sessions, horse.weeklyLimitMin, today);
  const week = weeks[weeks.length - 1];
  const peak = Math.max(week.limit, ...weeks.map((w) => w.total));

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{horse.name}</h2>
          <p className="text-xs text-muted-foreground">{t("limit", { min: week.limit })}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={t("editHorse")}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">{t("thisWeek", { total: week.total, limit: week.limit })}</span>
          <span className="text-xs text-muted-foreground">{t("canter", { min: week.canter })}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={week.total} aria-valuemin={0} aria-valuemax={week.limit} aria-label={horse.name}>
          <div className={cn("h-full rounded-full", STATUS_BAR[week.status])} style={{ width: `${Math.min(100, week.share * 100)}%` }} />
        </div>
      </div>

      {(week.status !== "ok" || week.hardSessions > 0 || week.restDays === 0) && week.total > 0 && (
        <ul className="space-y-1 rounded-xl bg-amber-50 p-2.5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {week.status === "over" && <Alert>{t("over")}</Alert>}
          {week.status === "near" && <Alert>{t("near")}</Alert>}
          {week.hardSessions > 0 && <Alert>{t("hard", { count: week.hardSessions, max: MAX_CANTER_PER_SESSION_MIN })}</Alert>}
          {week.restDays === 0 && <Alert>{t("noRest")}</Alert>}
        </ul>
      )}

      {/* The last four weeks, against the limit */}
      <div className="flex h-16 items-end gap-2" aria-hidden="true">
        {weeks.map((w) => (
          <div key={w.monday} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div className={cn("w-full rounded-t-md", STATUS_BAR[w.status], w.total === 0 && "bg-muted")} style={{ height: `${Math.max(4, (w.total / peak) * 100)}%` }} />
            </div>
            <span className="text-[0.65rem] text-muted-foreground">{short(w.monday)}</span>
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={onLog}>
        <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
        {t("logSession")}
      </Button>

      {sessions.length > 0 && (
        <ul className="space-y-1">
          {sessions.slice(0, 5).map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span className="w-20 shrink-0 text-muted-foreground">{day(s.date)}</span>
              <span className="flex-1 tabular-nums">
                {t("sessionLine", { total: sessionMinutes(s), walk: s.walkMin, trot: s.trotMin, canter: s.canterMin })}
              </span>
              <button type="button" onClick={() => s.id && deleteHorseSession(s.id)} aria-label={t("deleteSession")} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </li>
  );
}

function HorseDialog({ horse, onClose }: { horse: Partial<Horse> | null; onClose: () => void }) {
  const t = useTranslations("horses");
  return (
    <Dialog open={horse !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{horse && <HorseForm key={horse.id ?? "new"} horse={horse} onClose={onClose} title={horse.id ? t("editHorse") : t("addHorse")} />}</DialogContent>
    </Dialog>
  );
}

function HorseForm({ horse, onClose, title }: { horse: Partial<Horse>; onClose: () => void; title: string }) {
  const t = useTranslations("horses");
  const [name, setName] = useState(horse.name ?? "");
  const [limit, setLimit] = useState(horse.weeklyLimitMin ? String(horse.weeklyLimitMin) : "");
  const [notes, setNotes] = useState(horse.notes ?? "");
  const limitNum = Number(limit);
  const badLimit = !!limit.trim() && (!Number.isInteger(limitNum) || limitNum < 10 || limitNum > 1500);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <label className="block space-y-1 text-sm font-medium">
        <span>{t("name")}</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        <span>{t("weeklyLimit")}</span>
        <Input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" placeholder="150" aria-invalid={badLimit} />
        <span className="block text-xs font-normal text-muted-foreground">{t("weeklyLimitHint")}</span>
      </label>
      <label className="block space-y-1 text-sm font-medium">
        <span>{t("notes")}</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
      </label>
      <Button
        disabled={!name.trim() || badLimit}
        onClick={async () => {
          await saveHorse({ name: name.trim(), weeklyLimitMin: limit.trim() ? limitNum : null, notes: notes.trim() || null }, horse.id);
          onClose();
        }}
      >
        {t("save")}
      </Button>
      {horse.id && (
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={async () => {
            await deleteHorse(horse.id!);
            onClose();
          }}
        >
          <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("deleteHorse")}
        </Button>
      )}
    </>
  );
}

function SessionDialog({ horse, today, onClose }: { horse: Horse | null; today: string; onClose: () => void }) {
  const t = useTranslations("horses");
  return (
    <Dialog open={horse !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{horse && <SessionForm key={horse.id} horse={horse} today={today} onClose={onClose} title={t("logTitle", { name: horse.name })} />}</DialogContent>
    </Dialog>
  );
}

function SessionForm({ horse, today, onClose, title }: { horse: Horse; today: string; onClose: () => void; title: string }) {
  const t = useTranslations("horses");
  const [date, setDate] = useState(today);
  const [walk, setWalk] = useState(10);
  const [trot, setTrot] = useState(5);
  const [canter, setCanter] = useState(10);
  const [notes, setNotes] = useState("");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <label className="flex items-center gap-3 text-sm font-medium">
        <span className="flex-1">{t("date")}</span>
        <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      </label>
      <Minutes label={t("walk")} value={walk} onChange={setWalk} />
      <Minutes label={t("trot")} value={trot} onChange={setTrot} />
      <Minutes label={t("canterLabel")} value={canter} onChange={setCanter} />
      {canter > MAX_CANTER_PER_SESSION_MIN && <p className="text-xs text-amber-700 dark:text-amber-300">{t("canterWarning", { max: MAX_CANTER_PER_SESSION_MIN })}</p>}
      <label className="block space-y-1 text-sm font-medium">
        <span>{t("notes")}</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder={t("notesPlaceholder")} />
      </label>
      <Button
        disabled={walk + trot + canter === 0}
        onClick={async () => {
          await addHorseSession({ horseId: horse.id!, date, walkMin: walk, trotMin: trot, canterMin: canter, notes: notes.trim() || null });
          onClose();
        }}
      >
        {t("saveSession", { total: walk + trot + canter })}
      </Button>
    </>
  );
}

function Minutes({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(300, v)));
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-sm font-medium">{label}</span>
      <button type="button" onClick={() => set(value - 5)} aria-label={`${label} −5`} className="t-well flex size-10 items-center justify-center rounded-xl">
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="w-14 text-center text-lg font-bold tabular-nums">{value} min</span>
      <button type="button" onClick={() => set(value + 5)} aria-label={`${label} +5`} className="t-well flex size-10 items-center justify-center rounded-xl">
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

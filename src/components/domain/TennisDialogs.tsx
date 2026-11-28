"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { TennisAgeBand, TennisCategory, TennisDrill, TennisEquipment, TennisGroup, TennisLesson, TennisLevel, TennisSlot } from "@/db";
import { AGE_BANDS, CATEGORIES, EQUIPMENT, LEVELS, drillText, suitsAge } from "@/lib/tennis";
import { adminSaveLibraryDrill, deleteOwnDrill, deleteTennisGroup, saveOwnDrill, saveTennisGroup, updateTennisLesson, type DrillFields } from "@/hooks/useTennis";
import { search } from "@/lib/search";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Choice, ChoiceField } from "@/components/ui/choice";
import { Chip, ChipRow, SearchField } from "@/components/ui/find";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** A group made or changed: its name, age, level, weekly slots and how many play (never who). */
export function GroupDialog({ group, onClose }: { group: Partial<TennisGroup> | null; onClose: () => void }) {
  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden">
        {group && <GroupForm key={group.id ?? "new"} group={group} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function GroupForm({ group, onClose }: { group: Partial<TennisGroup>; onClose: () => void }) {
  const t = useTranslations("tennis");
  const [name, setName] = useState(group.name ?? "");
  const [ageBand, setAgeBand] = useState<TennisAgeBand | null>(group.ageBand ?? null);
  const [level, setLevel] = useState<TennisLevel | null>(group.level ?? null);
  const [slots, setSlots] = useState<TennisSlot[]>(group.slots?.length ? group.slots : [{ day: 2, time: "17:00", minutes: 60 }]);
  const [players, setPlayers] = useState(group.players ? String(group.players) : "");
  const [notes, setNotes] = useState(group.notes ?? "");
  const [confirming, setConfirming] = useState(false);
  const setSlot = (i: number, patch: Partial<TennisSlot>) => setSlots((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const n = Number(players);

  async function save() {
    await saveTennisGroup(
      {
        name: name.trim().slice(0, 60),
        ageBand,
        level,
        slots: slots.filter((s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)).map((s) => ({ ...s, minutes: Math.min(240, Math.max(15, Math.round(s.minutes) || 60)) })),
        players: Number.isInteger(n) && n >= 1 && n <= 40 ? n : null,
        notes: notes.trim().slice(0, 1000) || null,
      },
      group.id
    );
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{group.id ? t("editGroup") : t("newGroup")}</DialogTitle>
      </DialogHeader>
      <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1">
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">{t("groupName")}</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("groupNamePlaceholder")} maxLength={60} />
        </label>
        <ChoiceField label={t("ageBand")}>
          {AGE_BANDS.map((a) => (
            <Choice key={a} on={ageBand === a} onClick={() => setAgeBand(ageBand === a ? null : a)}>{t(`age_${a}`)}</Choice>
          ))}
        </ChoiceField>
        <ChoiceField label={t("level")}>
          {LEVELS.map((l) => (
            <Choice key={l} on={level === l} onClick={() => setLevel(level === l ? null : l)}>{t(`level_${l}`)}</Choice>
          ))}
        </ChoiceField>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">{t("slots")}</legend>
          {slots.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <label className="min-w-0 flex-1 space-y-1 text-xs">
                <span className="text-muted-foreground">{t("slotDay")}</span>
                <select
                  value={s.day}
                  onChange={(e) => setSlot(i, { day: Number(e.target.value) })}
                  className="h-11 w-full rounded-lg border border-border bg-transparent px-2 text-sm"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{t(`day_${d}`)}</option>
                  ))}
                </select>
              </label>
              <label className="w-24 space-y-1 text-xs">
                <span className="text-muted-foreground">{t("slotTime")}</span>
                <Input type="time" value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} />
              </label>
              <label className="w-20 space-y-1 text-xs">
                <span className="text-muted-foreground">{t("slotMinutes")}</span>
                <Input type="number" inputMode="numeric" min={15} max={240} value={s.minutes} onChange={(e) => setSlot(i, { minutes: Number(e.target.value) })} />
              </label>
              <Button variant="ghost" size="icon-sm" className="mb-1.5" onClick={() => setSlots((all) => all.filter((_, j) => j !== i))} aria-label={t("removeSlot")}>
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          {slots.length < 7 && (
            <Button variant="outline" size="sm" onClick={() => setSlots((all) => [...all, { day: 4, time: "17:00", minutes: 60 }])}>
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {t("addSlot")}
            </Button>
          )}
        </fieldset>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">{t("players")}</span>
          <Input type="number" inputMode="numeric" min={1} max={40} value={players} onChange={(e) => setPlayers(e.target.value)} className="w-24" />
          <span className="block text-xs text-muted-foreground">{t("playersHint")}</span>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">{t("notes")}</span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} />
        </label>
        {group.id && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await saveTennisGroup({ name: group.name!, ageBand: group.ageBand ?? null, level: group.level ?? null, slots: group.slots ?? [], players: group.players ?? null, notes: group.notes ?? null, archivedAt: group.archivedAt ? null : new Date().toISOString() }, group.id);
                onClose();
              }}
            >
              {t(group.archivedAt ? "unarchive" : "archive")}
            </Button>
            {confirming ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await deleteTennisGroup(group.id!);
                  onClose();
                }}
              >
                {t("deleteGroupConfirm", { name: group.name ?? "" })}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirming(true)}>
                <Trash2 className="mr-1 size-4" aria-hidden="true" />
                {t("deleteGroup")}
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
        <Button onClick={save} disabled={!name.trim()}>{t("save")}</Button>
      </div>
    </>
  );
}

/** After the lesson: how many came, how hard it was, a note. */
export function GivenDialog({ lesson, onClose }: { lesson: TennisLesson | null; onClose: () => void }) {
  return (
    <Dialog open={!!lesson} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{lesson && <GivenForm key={lesson.id} lesson={lesson} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function GivenForm({ lesson, onClose }: { lesson: TennisLesson; onClose: () => void }) {
  const t = useTranslations("tennis");
  const [present, setPresent] = useState(lesson.present != null ? String(lesson.present) : "");
  const [intensity, setIntensity] = useState<number | null>(lesson.intensity ?? null);
  const [notes, setNotes] = useState(lesson.notes ?? "");
  const n = Number(present);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("givenTitle")}</DialogTitle>
      </DialogHeader>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">{t("presentLabel")}</span>
        <Input type="number" inputMode="numeric" min={0} max={40} value={present} onChange={(e) => setPresent(e.target.value)} className="w-24" />
      </label>
      <ChoiceField label={t("intensity")} hint={t("intensityHint")}>
        {[1, 2, 3, 4, 5].map((v) => (
          <Choice key={v} on={intensity === v} onClick={() => setIntensity(intensity === v ? null : v)}>
            {`${v} · ${t(`intensity_${v}`)}`}
          </Choice>
        ))}
      </ChoiceField>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">{t("note")}</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notePlaceholder")} maxLength={2000} rows={3} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
        <Button
          onClick={async () => {
            await updateTennisLesson(lesson.id!, {
              givenAt: lesson.givenAt ?? new Date().toISOString(),
              present: present !== "" && Number.isInteger(n) && n >= 0 && n <= 40 ? n : null,
              intensity,
              notes: notes.trim().slice(0, 2000) || null,
            });
            onClose();
          }}
        >
          {t("save")}
        </Button>
      </div>
    </>
  );
}

/** A drill made or changed: one's own, or the library's by an admin (in three languages). */
export function DrillDialog({ drill, admin, onClose }: { drill: Partial<TennisDrill> | null; admin: boolean; onClose: () => void }) {
  return (
    <Dialog open={!!drill} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden">
        {drill && <DrillForm key={drill.id ?? "new"} drill={drill} admin={admin} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DrillForm({ drill, admin, onClose }: { drill: Partial<TennisDrill>; admin: boolean; onClose: () => void }) {
  const t = useTranslations("tennis");
  // A library drill (no owner, already saved) is the admin's to change; a new one by an admin goes to the library.
  const library = drill.id ? !drill.userId : admin;
  const [f, setF] = useState<DrillFields>({
    name: drill.name ?? "",
    nameFr: drill.nameFr ?? "",
    nameDe: drill.nameDe ?? "",
    description: drill.description ?? "",
    descriptionFr: drill.descriptionFr ?? "",
    descriptionDe: drill.descriptionDe ?? "",
    category: drill.category ?? "forehand",
    minutes: drill.minutes ?? 10,
    ages: drill.ages ?? [],
    equipment: drill.equipment ?? [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const set = (patch: Partial<DrillFields>) => setF((v) => ({ ...v, ...patch }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const clean = (): DrillFields => ({
    ...f,
    name: f.name.trim().slice(0, 80),
    nameFr: f.nameFr?.trim().slice(0, 80) || null,
    nameDe: f.nameDe?.trim().slice(0, 80) || null,
    description: f.description?.trim().slice(0, 500) || null,
    descriptionFr: f.descriptionFr?.trim().slice(0, 500) || null,
    descriptionDe: f.descriptionDe?.trim().slice(0, 500) || null,
    minutes: Math.min(60, Math.max(1, Math.round(f.minutes) || 10)),
  });

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(false);
    try {
      await action();
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{drill.id ? t("editDrill") : t("newDrill")}</DialogTitle>
      </DialogHeader>
      <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1">
        {library && <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">{t("libraryNote")}</p>}
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">{library ? t("nameEn") : t("drillName")}</span>
          <Input value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} />
        </label>
        {library && (
          <>
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">{t("nameFr")}</span>
              <Input value={f.nameFr ?? ""} onChange={(e) => set({ nameFr: e.target.value })} maxLength={80} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">{t("nameDe")}</span>
              <Input value={f.nameDe ?? ""} onChange={(e) => set({ nameDe: e.target.value })} maxLength={80} />
            </label>
          </>
        )}
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">{library ? t("descriptionEn") : t("drillDescription")}</span>
          <Textarea value={f.description ?? ""} onChange={(e) => set({ description: e.target.value })} maxLength={500} rows={2} />
        </label>
        {library && (
          <>
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">{t("descriptionFr")}</span>
              <Textarea value={f.descriptionFr ?? ""} onChange={(e) => set({ descriptionFr: e.target.value })} maxLength={500} rows={2} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">{t("descriptionDe")}</span>
              <Textarea value={f.descriptionDe ?? ""} onChange={(e) => set({ descriptionDe: e.target.value })} maxLength={500} rows={2} />
            </label>
          </>
        )}
        <ChoiceField label={t("drillCategory")}>
          {CATEGORIES.map((c) => (
            <Choice key={c} on={f.category === c} onClick={() => set({ category: c })}>{t(`cat_${c}`)}</Choice>
          ))}
        </ChoiceField>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">{t("drillMinutes")}</span>
          <Input type="number" inputMode="numeric" min={1} max={60} value={f.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })} className="w-24" />
        </label>
        <ChoiceField label={t("drillAges")} hint={t("drillAgesHint")}>
          {AGE_BANDS.map((a) => (
            <Choice key={a} on={f.ages.includes(a)} onClick={() => set({ ages: toggle(f.ages, a) })}>{t(`age_${a}`)}</Choice>
          ))}
        </ChoiceField>
        <ChoiceField label={t("drillEquipment")}>
          {EQUIPMENT.map((e) => (
            <Choice key={e} on={f.equipment.includes(e)} onClick={() => set({ equipment: toggle<TennisEquipment>(f.equipment, e) })}>{t(`eq_${e}`)}</Choice>
          ))}
        </ChoiceField>
        {drill.id && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={busy}
            onClick={() => run(() => (library ? adminSaveLibraryDrill(clean(), drill as TennisDrill, true) : deleteOwnDrill(drill.id!)))}
          >
            <Trash2 className="mr-1 size-4" aria-hidden="true" />
            {t("deleteDrill")}
          </Button>
        )}
        {error && <p role="alert" className="text-xs text-destructive">{t("libraryError")}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
        <Button
          disabled={!f.name.trim() || busy}
          onClick={() => run(() => (library ? adminSaveLibraryDrill(clean(), drill.id ? (drill as TennisDrill) : undefined) : saveOwnDrill(clean(), drill.id)))}
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : t("save")}
        </Button>
      </div>
    </>
  );
}

/**
 * The drills, found by name, theme and age: the library's and one's own.
 * With a group's age band, only the drills that suit it at first.
 */
export function DrillList({
  drills,
  ageBand,
  onPick,
  pickLabel,
}: {
  drills: TennisDrill[];
  ageBand?: TennisAgeBand | null;
  onPick: (drill: TennisDrill) => void;
  /** The action a row does, for a screen reader: "Add" in a lesson, "Edit" in the library. */
  pickLabel: (name: string) => string;
}) {
  const t = useTranslations("tennis");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TennisCategory | null>(null);
  const [forAge, setForAge] = useState(!!ageBand);
  const found = useMemo(() => {
    const kept = drills.filter((d) => (!category || d.category === category) && (!forAge || suitsAge(d, ageBand)));
    const sorted = [...kept].sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || drillText(a, locale).name.localeCompare(drillText(b, locale).name, locale));
    return search(sorted, query, (d) => ({ names: [d.name, d.nameFr, d.nameDe], others: [d.description, d.descriptionFr, d.descriptionDe, t(`cat_${d.category}`)] }));
  }, [drills, category, forAge, ageBand, query, locale, t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <SearchField value={query} onChange={setQuery} placeholder={t("searchDrill")} clearLabel={t("clear")} />
      <ChipRow label={t("drillCategory")}>
        <Chip on={!category} onClick={() => setCategory(null)}>{t("allThemes")}</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} on={category === c} onClick={() => setCategory(category === c ? null : c)}>{t(`cat_${c}`)}</Chip>
        ))}
      </ChipRow>
      {ageBand && (
        <ChipRow label={t("ageBand")}>
          <Chip on={forAge} onClick={() => setForAge(!forAge)}>{t("forAge", { age: t(`age_${ageBand}`) })}</Chip>
        </ChipRow>
      )}
      <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-1" aria-live="polite">
        {found.map((d) => {
          const { name, description } = drillText(d, locale);
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onPick(d)}
                aria-label={pickLabel(name)}
                className="flex min-h-11 w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {[t(`cat_${d.category}`), t("minutesShort", { minutes: d.minutes }), d.ages.length && d.ages.length < AGE_BANDS.length ? d.ages.map((a) => t(`age_${a}`)).join(", ") : null, d.userId ? t("ownDrill") : null].filter(Boolean).join(" · ")}
                </span>
                {description && <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span>}
              </button>
            </li>
          );
        })}
        {!found.length && <li className="py-6 text-center text-sm text-muted-foreground">{t("noDrills")}</li>}
      </ul>
    </div>
  );
}

/** A drill to add to a lesson, in a dialog. */
export function DrillPicker({ open, drills, ageBand, onPick, onClose }: { open: boolean; drills: TennisDrill[]; ageBand?: TennisAgeBand | null; onPick: (drill: TennisDrill) => void; onClose: () => void }) {
  const t = useTranslations("tennis");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[85dvh] max-h-[85dvh] flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("addDrill")}</DialogTitle>
        </DialogHeader>
        {open && <DrillList drills={drills} ageBand={ageBand} onPick={onPick} pickLabel={(name) => t("addNamed", { name })} />}
      </DialogContent>
    </Dialog>
  );
}

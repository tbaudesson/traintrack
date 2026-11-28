"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Exercise, type GroupLesson, type HorseSession, type LessonGroup, type LessonSlot } from "@/db";
import { drillText, suitsAge } from "@/lib/lessons";
import { refLabel, sportOf, type LessonSport, type LessonsReference } from "@/lib/lessonsReference";
import { addOwnLessonExercise, deleteLessonGroup, saveLessonGroup, updateGroupLesson } from "@/hooks/useLessons";
import { addHorseSession, updateHorseSession, useHorses } from "@/hooks/useHorses";
import { search } from "@/lib/search";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Choice, ChoiceField } from "@/components/ui/choice";
import { Chip, ChipRow, SearchField } from "@/components/ui/find";
import { demoVideo } from "@/lib/demoVideos";
import { VideoEmbed } from "@/components/domain/VideoEmbed";
import { ExerciseDetails } from "@/components/domain/ExerciseDetails";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** A group made or changed: its sport, name, age, level, weekly slots and how many play (never who). */
export function GroupDialog({ group, reference, onClose }: { group: Partial<LessonGroup> | null; reference: LessonsReference; onClose: () => void }) {
  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden">
        {group && <GroupForm key={group.id ?? "new"} group={group} reference={reference} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function GroupForm({ group, reference, onClose }: { group: Partial<LessonGroup>; reference: LessonsReference; onClose: () => void }) {
  const t = useTranslations("lessons");
  const locale = useLocale();
  const [sport, setSport] = useState(group.sport ?? reference.sports[0].id);
  const [name, setName] = useState(group.name ?? "");
  const [ageBand, setAgeBand] = useState<string | null>(group.ageBand ?? null);
  const [level, setLevel] = useState<string | null>(group.level ?? null);
  const [slots, setSlots] = useState<LessonSlot[]>(group.slots?.length ? group.slots : [{ day: 2, time: "17:00", minutes: 60 }]);
  const [players, setPlayers] = useState(group.players ? String(group.players) : "");
  const [notes, setNotes] = useState(group.description ?? "");
  const [confirming, setConfirming] = useState(false);
  const def = sportOf(reference, sport);
  const setSlot = (i: number, patch: Partial<LessonSlot>) => setSlots((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const n = Number(players);
  const fields = () => ({
    sport,
    name: name.trim().slice(0, 60),
    ageBand,
    level,
    slots: slots.filter((s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)).map((s) => ({ ...s, minutes: Math.min(240, Math.max(15, Math.round(s.minutes) || 60)) })),
    players: Number.isInteger(n) && n >= 1 && n <= 40 ? n : null,
    description: notes.trim().slice(0, 1000) || null,
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{group.id ? t("editGroup") : t("newGroup")}</DialogTitle>
      </DialogHeader>
      <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1">
        {/* The sport decides the themes, ages, levels and exercises: chosen once. */}
        {!group.id && reference.sports.length > 1 && (
          <ChoiceField label={t("sport")}>
            {reference.sports.map((s) => (
              <Choice
                key={s.id}
                on={sport === s.id}
                onClick={() => {
                  setSport(s.id);
                  setAgeBand(null);
                  setLevel(null);
                }}
              >
                {refLabel(reference.sports, s.id, locale)}
              </Choice>
            ))}
          </ChoiceField>
        )}
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">{t("groupName")}</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("groupNamePlaceholder")} maxLength={60} />
        </label>
        <ChoiceField label={t("ageBand")}>
          {(def?.ageBands ?? []).map(({ id: a }) => (
            <Choice key={a} on={ageBand === a} onClick={() => setAgeBand(ageBand === a ? null : a)}>{refLabel(def?.ageBands, a, locale)}</Choice>
          ))}
        </ChoiceField>
        <ChoiceField label={t("level")}>
          {(def?.levels ?? []).map(({ id: l }) => (
            <Choice key={l} on={level === l} onClick={() => setLevel(level === l ? null : l)}>{refLabel(def?.levels, l, locale)}</Choice>
          ))}
        </ChoiceField>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">{t("slots")}</legend>
          {slots.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <label className="min-w-0 flex-1 space-y-1 text-xs">
                <span className="text-muted-foreground">{t("slotDay")}</span>
                <select value={s.day} onChange={(e) => setSlot(i, { day: Number(e.target.value) })} className="h-11 w-full rounded-lg border border-border bg-transparent px-2 text-sm">
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{t(`day_${d}`)}</option>
                  ))}
                </select>
              </label>
              <label className="w-24 shrink-0 space-y-1 text-xs">
                <span className="text-muted-foreground">{t("slotTime")}</span>
                <Input type="time" value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} />
              </label>
              <label className="w-20 shrink-0 space-y-1 text-xs">
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
                await saveLessonGroup({ ...fields(), archivedAt: group.archivedAt ? null : new Date().toISOString() }, group.id);
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
                  await deleteLessonGroup(group.id!);
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
        <Button
          onClick={async () => {
            await saveLessonGroup(fields(), group.id);
            onClose();
          }}
          disabled={!name.trim()}
        >
          {t("save")}
        </Button>
      </div>
    </>
  );
}

/**
 * After the lesson: how many came, how hard it was, a note; on a horse
 * (vaulting), which one and its minutes at each gait, logged on the horse.
 */
export function GivenDialog({ lesson, group, sport, onClose }: { lesson: GroupLesson | null; group: LessonGroup; sport: LessonSport | undefined; onClose: () => void }) {
  // The horse's work already logged with the lesson, to change it: the form
  // waits for it (a reading kept from before would say there is none).
  const wanted = lesson?.horseSessionId ?? null;
  const read = useLiveQuery(async () => ({ id: wanted, session: wanted ? ((await db.horseSessions.get(wanted)) ?? null) : null }), [wanted]);
  const ready = !!read && read.id === wanted;
  return (
    <Dialog open={!!lesson} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden">
        {lesson && ready && <GivenForm key={lesson.id} lesson={lesson} group={group} horses={!!sport?.horses} session={read.session} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function GivenForm({ lesson, group, horses: onHorse, session, onClose }: { lesson: GroupLesson; group: LessonGroup; horses: boolean; session: HorseSession | null; onClose: () => void }) {
  const t = useTranslations("lessons");
  const horses = useHorses();
  const [present, setPresent] = useState(lesson.present != null ? String(lesson.present) : "");
  const [intensity, setIntensity] = useState<number | null>(lesson.intensity ?? null);
  const [notes, setNotes] = useState(lesson.notes ?? "");
  const [horseId, setHorseId] = useState<number | null>(lesson.horseId ?? null);
  const [gaits, setGaits] = useState({ walk: session ? String(session.walkMin) : "", trot: session ? String(session.trotMin) : "", canter: session ? String(session.canterMin) : "" });
  const n = Number(present);
  const minutes = (v: string) => Math.min(300, Math.max(0, Math.round(Number(v)) || 0));

  async function save() {
    let horseSessionId = lesson.horseSessionId ?? null;
    // The horse's work, logged on it with the lesson (changed with it).
    if (onHorse && horseId) {
      const work = { horseId, date: lesson.date, walkMin: minutes(gaits.walk), trotMin: minutes(gaits.trot), canterMin: minutes(gaits.canter), notes: group.name };
      if (horseSessionId) await updateHorseSession(horseSessionId, work);
      else if (!horseSessionId && work.walkMin + work.trotMin + work.canterMin > 0) horseSessionId = await addHorseSession(work);
    }
    await updateGroupLesson(lesson.id!, {
      givenAt: lesson.givenAt ?? new Date().toISOString(),
      present: present !== "" && Number.isInteger(n) && n >= 0 && n <= 40 ? n : null,
      intensity,
      notes: notes.trim().slice(0, 2000) || null,
      ...(onHorse ? { horseId, horseSessionId } : {}),
    });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("givenTitle")}</DialogTitle>
      </DialogHeader>
      <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1">
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
        {onHorse && (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-semibold">{t("horse")}</legend>
            {horses.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noHorse")}</p>
            ) : (
              <>
                <select
                  aria-label={t("horse")}
                  value={horseId ?? ""}
                  onChange={(e) => setHorseId(e.target.value ? Number(e.target.value) : null)}
                  className="h-11 w-full rounded-lg border border-border bg-transparent px-2 text-sm"
                >
                  <option value="">{t("noHorseChosen")}</option>
                  {horses.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                {horseId && (
                  <div className="grid grid-cols-3 gap-2">
                    {(["walk", "trot", "canter"] as const).map((g) => (
                      <label key={g} className="space-y-1 text-xs">
                        <span className="text-muted-foreground">{t(`gait_${g}`)}</span>
                        <Input type="number" inputMode="numeric" min={0} max={300} value={gaits[g]} onChange={(e) => setGaits((v) => ({ ...v, [g]: e.target.value }))} placeholder="0" />
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t("horseHint")}</p>
              </>
            )}
          </fieldset>
        )}
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">{t("note")}</span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notePlaceholder")} maxLength={2000} rows={3} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
        <Button onClick={() => void save()}>{t("save")}</Button>
      </div>
    </>
  );
}

/** One's own exercise for a sport's lessons, added to the one library. */
function OwnExerciseForm({ sport, onDone, onCancel }: { sport: LessonSport; onDone: (ex: Exercise) => void; onCancel: () => void }) {
  const t = useTranslations("lessons");
  const locale = useLocale();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState(sport.themes[0]?.id ?? "");
  const [minutes, setMinutes] = useState(10);
  const [ages, setAges] = useState<string[]>([]);
  const [gear, setGear] = useState<string[]>([]);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1">
      <p className="text-xs text-muted-foreground">{t("ownExerciseHint")}</p>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">{t("drillName")}</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">{t("drillDescription")}</span>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} />
      </label>
      <ChoiceField label={t("drillCategory")}>
        {sport.themes.map(({ id }) => (
          <Choice key={id} on={theme === id} onClick={() => setTheme(id)}>{refLabel(sport.themes, id, locale)}</Choice>
        ))}
      </ChoiceField>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">{t("drillMinutes")}</span>
        <Input type="number" inputMode="numeric" min={1} max={60} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-24" />
      </label>
      <ChoiceField label={t("drillAges")} hint={t("drillAgesHint")}>
        {sport.ageBands.map(({ id }) => (
          <Choice key={id} on={ages.includes(id)} onClick={() => setAges(toggle(ages, id))}>{refLabel(sport.ageBands, id, locale)}</Choice>
        ))}
      </ChoiceField>
      <ChoiceField label={t("drillEquipment")}>
        {sport.equipment.map(({ id }) => (
          <Choice key={id} on={gear.includes(id)} onClick={() => setGear(toggle(gear, id))}>{refLabel(sport.equipment, id, locale)}</Choice>
        ))}
      </ChoiceField>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCancel}>{t("cancel")}</Button>
        <Button
          disabled={!name.trim()}
          onClick={async () => {
            const fields = {
              name: name.trim().slice(0, 80),
              description: description.trim().slice(0, 500) || undefined,
              sport: sport.id,
              theme,
              minutes: Math.min(60, Math.max(1, Math.round(minutes) || 10)),
              ages,
              gear,
            };
            const id = await addOwnLessonExercise(fields);
            onDone({ ...fields, id, muscleGroup: "", isCustom: true, createdAt: "", updatedAt: "" } as Exercise);
          }}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

/**
 * The exercises of the library for a lesson: those of the group's sport
 * (suiting its age at first), found by name and theme; the whole library on
 * demand (a strength move for the warm-up, say).
 */
export function LessonExerciseList({
  exercises,
  sport,
  ageBand,
  onPick,
  pickLabel,
}: {
  exercises: Exercise[];
  sport: LessonSport;
  ageBand?: string | null;
  onPick: (ex: Exercise) => void;
  pickLabel: (name: string) => string;
}) {
  const t = useTranslations("lessons");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<string | null>(null);
  const [forAge, setForAge] = useState(!!ageBand);
  const [whole, setWhole] = useState(false);
  const found = useMemo(() => {
    const ofSport = (e: Exercise) => (whole ? true : e.sport === sport.id);
    const kept = exercises.filter((e) => !e.deletedAt && ofSport(e) && (!theme || e.theme === theme) && (!forAge || suitsAge(e, ageBand)));
    const rank = (c: string | null | undefined) => {
      const i = sport.themes.findIndex((th) => th.id === c);
      return i < 0 ? sport.themes.length : i;
    };
    const sorted = [...kept].sort((a, b) => rank(a.theme) - rank(b.theme) || drillText(a, locale).name.localeCompare(drillText(b, locale).name, locale));
    return search(sorted, query, (e) => ({ names: [e.name, e.nameFr, e.nameDe], others: [e.description, e.descriptionFr, e.descriptionDe, refLabel(sport.themes, e.theme, locale)] }));
  }, [exercises, sport, theme, forAge, ageBand, query, locale, whole]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <SearchField value={query} onChange={setQuery} placeholder={t("searchDrill")} clearLabel={t("clear")} />
      <ChipRow label={t("drillCategory")}>
        <Chip on={!theme} onClick={() => setTheme(null)}>{t("allThemes")}</Chip>
        {sport.themes.map(({ id }) => (
          <Chip key={id} on={theme === id} onClick={() => setTheme(theme === id ? null : id)}>{refLabel(sport.themes, id, locale)}</Chip>
        ))}
      </ChipRow>
      <ChipRow label={t("scope")}>
        {ageBand && <Chip on={forAge} onClick={() => setForAge(!forAge)}>{t("forAge", { age: refLabel(sport.ageBands, ageBand, locale) })}</Chip>}
        <Chip on={whole} onClick={() => setWhole(!whole)}>{t("wholeLibrary")}</Chip>
      </ChipRow>
      <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-1" aria-live="polite">
        {found.map((e) => {
          const { name, description } = drillText(e, locale);
          return (
            <li key={e.id}>
              <button type="button" onClick={() => onPick(e)} aria-label={pickLabel(name)} className="flex min-h-11 w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted">
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {[
                    e.theme ? refLabel(sport.themes, e.theme, locale) : null,
                    e.minutes ? t("minutesShort", { minutes: e.minutes }) : null,
                    e.ages?.length && e.ages.length < sport.ageBands.length ? e.ages.map((a) => refLabel(sport.ageBands, a, locale)).join(", ") : null,
                    e.isCustom ? t("ownDrill") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
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

/** An exercise to add to a lesson, in a dialog; or one's own, made there. */
export function LessonExercisePicker({ open, exercises, sport, ageBand, onPick, onClose }: { open: boolean; exercises: Exercise[]; sport: LessonSport; ageBand?: string | null; onPick: (ex: Exercise) => void; onClose: () => void }) {
  const t = useTranslations("lessons");
  const [making, setMaking] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setMaking(false);
          onClose();
        }
      }}
    >
      <DialogContent className="flex h-[85dvh] max-h-[85dvh] flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{making ? t("newDrill") : t("addDrill")}</DialogTitle>
        </DialogHeader>
        {open && making && (
          <OwnExerciseForm
            sport={sport}
            onCancel={() => setMaking(false)}
            onDone={(ex) => {
              setMaking(false);
              onPick(ex);
            }}
          />
        )}
        {open && !making && (
          <>
            <LessonExerciseList exercises={exercises} sport={sport} ageBand={ageBand} onPick={onPick} pickLabel={(name) => t("addNamed", { name })} />
            <Button variant="outline" size="sm" onClick={() => setMaking(true)}>
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {t("newDrill")}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The exercise a lesson item came from: by its uuid, else by its name in any language. */
export function drillOf(item: { drill?: string | null; name: string }, library: Exercise[]): Exercise | undefined {
  return (
    (item.drill ? library.find((e) => e.uuid === item.drill) : undefined) ??
    library.find((e) => !e.deletedAt && [e.name, e.nameFr, e.nameDe].includes(item.name))
  );
}

/**
 * What a lesson's exercise is about, opened from the plan: its description,
 * its video when the library has one that plays here, and what the library
 * says of it (theme, minutes, ages, kit, key points).
 */
export function LessonDrillDialog({ item, library, onClose }: { item: { drill?: string | null; name: string } | null; library: Exercise[]; onClose: () => void }) {
  const t = useTranslations("lessons");
  const locale = useLocale();
  const ex = item ? drillOf(item, library) : undefined;
  const description = ex ? drillText(ex, locale).description : "";
  const video = demoVideo(ex?.videoUrl);
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>{item.name}</DialogTitle>
            </DialogHeader>
            {video && <VideoEmbed url={video} />}
            {description ? <p className="text-sm">{description}</p> : <p className="text-sm text-muted-foreground">{t("noDescription")}</p>}
            {ex && <ExerciseDetails ex={ex} library={library} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

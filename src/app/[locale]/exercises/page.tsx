"use client";

import { groupLabel } from "@/lib/muscles";
import { useEquipmentList } from "@/hooks/useReferences";
import { itemLabel } from "@/lib/references";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { useEffect, useMemo, useState } from "react";
import { AreaRulesEditor } from "@/components/domain/AreaRulesEditor";
import type { ExerciseRules } from "@/lib/injuries";
import { useLocale, useTranslations } from "next-intl";
import { useExercises, createCustomExercise, updateExercise, deleteExercise, patchExerciseLocal } from "@/hooks/useExercises";
import { useAuth } from "@/contexts/AuthContext";
import { adminCreateLibraryExercise, adminSetExerciseDetails, adminSetExerciseInjuryRules, adminSetExerciseMuscles, adminUpdateExerciseContent, adminUpdateExerciseI18n } from "@/lib/adminService";
import { ExerciseDetails, ExerciseDetailsEditor, LessonFieldsEditor, draftOf, listsOf, type DetailsDraft } from "@/components/domain/ExerciseDetails";
import { adminSetExerciseLesson } from "@/hooks/useLessons";

/** The lesson fields as saved: none at all when the exercise is not for lessons. */
const lessonFields = (l: DetailsDraft["lesson"]) =>
  l.sport
    ? { sport: l.sport, theme: l.theme, minutes: l.minutes, ages: l.ages.length ? l.ages : null, gear: l.gear.length ? l.gear : null }
    : { sport: null, theme: null, minutes: null, ages: null, gear: null };
import db from "@/db";
import type { Exercise, MuscleGroup, Equipment } from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { VideoEmbed } from "@/components/domain/VideoEmbed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Dumbbell, ChevronDown, ChevronUp, Pencil, Trash2, Check, X, History, PersonStanding } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { demoVideo } from "@/lib/demoVideos";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/page-parts";
import { useExerciseLabel, exerciseDescription } from "@/lib/exerciseNames";
import { search as searchItems } from "@/lib/search";
import { MuscleFilter } from "@/components/domain/BodyMap";
import { matchExercises, type MuscleRole, type MuscleSelection } from "@/lib/muscleMap";
import { useBodyRef } from "@/hooks/useBodyMuscles";
import { useLessonsReference } from "@/hooks/useLessonsReference";
import { refLabel, sportOf } from "@/lib/lessonsReference";
import { Chip, ChipRow } from "@/components/ui/find";


export default function ExercisesPage() {
  const t = useTranslations("exercises");
  const locale = useLocale();
  const tr = useTranslations("restrictions");
  const { isAdmin } = useAuth();
  const exercises = useExercises();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const tb = useTranslations("bodyMap");
  // The body map as a filter: muscles wanted, muscles ruled out.
  const [bodyOpen, setBodyOpen] = useState(false);
  const [selection, setSelection] = useState<MuscleSelection>({});
  const filtering = Object.keys(selection).length > 0;

  // One library for all: the general exercises, or those made for a sport's lessons (tennis, vaulting…), or all.
  const lessons = useLessonsReference();
  const [scope, setScope] = useState<string>("general");
  useEffect(() => {
    // Opened from a lesson notebook (?sport=tennis): that sport's exercises.
    const asked = new URLSearchParams(window.location.search).get("sport");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the address, only on the client
    if (asked) setScope(asked);
  }, []);
  const sport = lessons && scope !== "general" && scope !== "all" ? sportOf(lessons, scope) : undefined;
  // Names in every language and descriptions, accents ignored: "pompes" finds "Push-up".
  const filtered = useMemo(
    () =>
      searchItems(
        exercises.filter((e) => (scope === "all" ? true : scope === "general" ? !e.sport : e.sport === scope)),
        search,
        (e) => ({ names: [e.name, e.nameFr, e.nameDe], others: [e.description, e.descriptionFr, e.descriptionDe] })
      ),
    [exercises, search, scope]
  );

  const bodyRef = useBodyRef();
  const groups = useMuscleGroups();
  const matched = useMemo(() => (filtering && bodyRef ? matchExercises(filtered, selection, bodyRef) : []), [filtering, filtered, selection, bodyRef]);

  // By muscle group; a sport's exercises by their theme in a lesson.
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const k = (sport ? e.theme : e.muscleGroup) ?? "";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [filtered, sport]);
  const order = sport ? sport.themes.map((th) => th.id) : (groups ?? []).map((g) => g.id);
  const heading = (k: string) => (sport ? refLabel(sport.themes, k, locale) : groupLabel(groups, k, locale)) || t("noGroup");

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("addCustom")}
          </Button>
        }
      />
      <div className="mx-auto max-w-5xl space-y-4 p-4 pb-24 md:p-6">
        {adding && <AddExerciseForm onDone={() => setAdding(false)} />}

        {isAdmin && (
          <p className="text-xs text-muted-foreground">
            {tr("coverage", {
              total: exercises.filter((e) => !e.isCustom).length,
              movements: exercises.filter((e) => !e.isCustom && e.movements?.length).length,
              cues: exercises.filter((e) => !e.isCustom && Object.keys(e.cues ?? {}).length).length,
            })}
          </p>
        )}

        {lessons && (
          <ChipRow label={t("scope")}>
            <Chip on={scope === "general"} onClick={() => setScope("general")}>{t("scopeGeneral")}</Chip>
            {lessons.sports.map((x) => (
              <Chip key={x.id} on={scope === x.id} onClick={() => setScope(x.id)}>{refLabel(lessons.sports, x.id, locale)}</Chip>
            ))}
            <Chip on={scope === "all"} onClick={() => setScope("all")}>{t("scopeAll")}</Chip>
          </ChipRow>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} className="pl-10" />
        </div>

        <section className="t-surface rounded-2xl ring-1 ring-foreground/5">
          <button type="button" onClick={() => setBodyOpen((v) => !v)} aria-expanded={bodyOpen} className="flex min-h-12 w-full items-center gap-2 px-4 text-left">
            <PersonStanding className="size-4 text-accent-text" aria-hidden="true" />
            <span className="flex-1 text-sm font-semibold">{tb("filterTitle")}</span>
            {filtering && <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white">{Object.keys(selection).length}</span>}
            {bodyOpen ? <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />}
          </button>
          {bodyOpen && (
            <div className="px-4 pb-4">
              <MuscleFilter selection={selection} onChange={setSelection} />
            </div>
          )}
        </section>

        {filtering ? (
          <section className="space-y-1.5" aria-live="polite">
            <SectionHeading>{tb("count", { count: matched.length })}</SectionHeading>
            {matched.length === 0 && <p className="text-sm text-muted-foreground">{tb("none")}</p>}
            <div className="grid items-start gap-1.5 lg:grid-cols-2">
              {matched.map(({ exercise, role }) => (
                <ExerciseRow key={exercise.id} ex={exercise} library={exercises} role={role} />
              ))}
            </div>
          </section>
        ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {/* In the admin's order; a group the list no longer has (or none), after. */}
          {[...order, ...[...grouped.keys()].filter((k) => !order.includes(k))].filter((g) => grouped.has(g)).map((g) => (
            <section key={g} className="space-y-1.5">
              <SectionHeading>{heading(g)}</SectionHeading>
              {grouped.get(g)!.map((e) => (
                <ExerciseRow key={e.id} ex={e} library={exercises} />
              ))}
            </section>
          ))}
        </div>
        )}
      </div>
    </>
  );
}

function AddExerciseForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("exercises");
  const { isAdmin } = useAuth();
  const [library, setLibrary] = useState(false);
  const [nameFr, setNameFr] = useState("");
  const [nameDe, setNameDe] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const equipmentList = useEquipmentList();
  const groups = useMuscleGroups();
  const locale = useLocale();
  const [picked, setMg] = useState<MuscleGroup | null>(null);
  // The admin's first group until one is picked.
  const mg = picked ?? groups?.[0]?.id ?? "";
  const [pickedEquip, setEquip] = useState<Equipment | null>(null);
  // The admin's first equipment until one is picked.
  const equip = pickedEquip ?? equipmentList?.[0]?.id ?? "";
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (library) {
        // A shared library exercise: created server-side, then kept locally right away.
        const uuid = await adminCreateLibraryExercise({
          name: name.trim(), muscleGroup: mg, equipment: equip, description, videoUrl, nameFr, nameDe,
        });
        const now = new Date().toISOString();
        await db.exercises.add({
          uuid, userId: null, _dirty: 0, name: name.trim(), muscleGroup: mg, equipment: equip, isCustom: false,
          description: description.trim() || undefined, videoUrl: videoUrl.trim() || undefined,
          nameFr: nameFr.trim() || null, nameDe: nameDe.trim() || null, createdAt: now, updatedAt: now,
        });
        onDone();
        return;
      }
      await createCustomExercise({
        name: name.trim(), muscleGroup: mg, equipment: equip,
        description: description.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {isAdmin && (
          <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={library} onChange={(e) => setLibrary(e.target.checked)} className="size-5" />
            {t("toLibrary")}
          </label>
        )}
        <Input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("muscleGroup")}</label>
          <div className="flex flex-wrap gap-1.5">
            {(groups ?? []).map(({ id: g }) => (
              <button key={g} onClick={() => setMg(g)}
                className={cn("rounded-full border px-2.5 py-1 text-xs", mg === g ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-200" : "border-border text-muted-foreground")}>
                {groupLabel(groups, g, locale)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("equipment")}</label>
          <div className="flex flex-wrap gap-1.5">
            {(equipmentList ?? []).map(({ id: eq }) => (
              <button key={eq} onClick={() => setEquip(eq)}
                className={cn("rounded-full border px-2.5 py-1 text-xs", equip === eq ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-200" : "border-border text-muted-foreground")}>
                {itemLabel(equipmentList, eq, locale)}
              </button>
            ))}
          </div>
        </div>
        <Input placeholder={t("descPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input placeholder={t("videoPlaceholder")} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        {library && (
          <>
            <Input placeholder={t("nameFr")} value={nameFr} onChange={(e) => setNameFr(e.target.value)} />
            <Input placeholder={t("nameDe")} value={nameDe} onChange={(e) => setNameDe(e.target.value)} />
          </>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button onClick={handleAdd} disabled={busy || !name.trim()} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : library ? t("addLibrary") : t("addCustom")}
        </Button>
      </CardContent>
    </Card>
  );
}

function ExerciseRow({ ex, library, role }: { ex: Exercise; library: Exercise[]; role?: MuscleRole | null }) {
  const t = useTranslations("exercises");
  const tb = useTranslations("bodyMap");
  const tr = useTranslations("injuryRules");
  const xl = useExerciseLabel();
  const locale = useLocale();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(ex.name);
  const [description, setDescription] = useState(ex.description ?? "");
  const [videoUrl, setVideoUrl] = useState(ex.videoUrl ?? "");
  const [nameFr, setNameFr] = useState(ex.nameFr ?? "");
  const [nameDe, setNameDe] = useState(ex.nameDe ?? "");
  const [descriptionFr, setDescriptionFr] = useState(ex.descriptionFr ?? "");
  const [descriptionDe, setDescriptionDe] = useState(ex.descriptionDe ?? "");
  const [injuryRules, setInjuryRules] = useState<ExerciseRules>(ex.injuryRules ?? {});
  const [details, setDetails] = useState<DetailsDraft>(() => draftOf(ex));
  const [error, setError] = useState<string | null>(null);
  const hasDetail = !!ex.description || !!ex.videoUrl || !!ex.movements?.length || !!ex.level;
  // Custom exercises are fully editable by their owner; admins can also curate
  // the description/video on the shared built-in library.
  const canEdit = ex.isCustom || isAdmin;

  async function save() {
    setBusy(true);
    try {
      if (ex.isCustom) {
        await updateExercise(ex.id!, {
          name: name.trim() || ex.name,
          description: description.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          ...lessonFields(details.lesson),
        });
      } else if (isAdmin && ex.uuid) {
        // Built-in row: write server-side via the admin RPCs, then reflect locally.
        await adminUpdateExerciseContent(ex.uuid, description.trim(), videoUrl.trim());
        await adminUpdateExerciseI18n(ex.uuid, { nameFr, nameDe, descriptionFr, descriptionDe });
        await adminSetExerciseInjuryRules(ex.uuid, injuryRules as Record<string, "avoid" | "caution">);
        const cues = listsOf(details.cues);
        const mistakes = listsOf(details.mistakes);
        await adminSetExerciseDetails(ex.uuid, { level: details.level, movements: details.movements, secondaryMuscles: details.secondaryMuscles, cues, mistakes, variantOf: details.variantOf });
        await adminSetExerciseMuscles(ex.uuid, details.targetMuscles, details.assistMuscles);
        await adminSetExerciseLesson(ex, lessonFields(details.lesson));
        await patchExerciseLocal(ex.id!, {
          targetMuscles: details.targetMuscles.length ? details.targetMuscles : null,
          assistMuscles: details.assistMuscles.length ? details.assistMuscles : null,
          level: details.level,
          movements: details.movements.length ? details.movements : null,
          secondaryMuscles: details.secondaryMuscles.length ? details.secondaryMuscles : null,
          cues: Object.keys(cues).length ? cues : null,
          mistakes: Object.keys(mistakes).length ? mistakes : null,
          variantOf: details.variantOf,
          injuryRules: Object.keys(injuryRules).length ? injuryRules : null,
          description: description.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          nameFr: nameFr.trim() || null,
          nameDe: nameDe.trim() || null,
          descriptionFr: descriptionFr.trim() || null,
          descriptionDe: descriptionDe.trim() || null,
        });
      }
      setEditing(false);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-2.5">
        <button onClick={() => setOpen((v) => !v)} aria-expanded={hasDetail || canEdit ? open : undefined} className="flex w-full items-center gap-3 text-left">
          <Dumbbell className="h-4 w-4 text-accent-500" />
          <span className="flex-1 text-sm font-medium">{ex.isCustom ? ex.name : xl(ex.name)}</span>
          {ex.isCustom && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t("custom")}</span>
          )}
          {role && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", role === "target" ? "bg-accent-500/15 text-accent-text" : "bg-muted text-muted-foreground")}>
              {role === "target" ? tb("main") : tb("also")}
            </span>
          )}
          {(hasDetail || canEdit) && (open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
        </button>

        {open && (
          <div className="mt-2 space-y-2 border-t border-border pt-2">
            {editing ? (
              <>
                {ex.isCustom && <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} />}
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descPlaceholder")} />
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={t("videoPlaceholder")} />
                <p className="text-xs text-muted-foreground">{t("videoEmbedHint")}</p>
                {!ex.isCustom && isAdmin && (
                  <div className="space-y-2 rounded-lg bg-muted/40 p-2">
                    <p className="text-xs font-semibold text-muted-foreground">{t("translations")}</p>
                    <Input value={nameFr} onChange={(e) => setNameFr(e.target.value)} placeholder={t("nameFr")} aria-label={t("nameFr")} />
                    <Input value={descriptionFr} onChange={(e) => setDescriptionFr(e.target.value)} placeholder={t("descriptionFr")} aria-label={t("descriptionFr")} />
                    <Input value={nameDe} onChange={(e) => setNameDe(e.target.value)} placeholder={t("nameDe")} aria-label={t("nameDe")} />
                    <Input value={descriptionDe} onChange={(e) => setDescriptionDe(e.target.value)} placeholder={t("descriptionDe")} aria-label={t("descriptionDe")} />
                  </div>
                )}
                {!ex.isCustom && isAdmin && (
                  <div className="space-y-1 rounded-lg bg-muted/40 p-2">
                    <AreaRulesEditor value={injuryRules} onChange={setInjuryRules} label={tr("label")} />
                    <p className="text-xs text-muted-foreground">{tr("hint")}</p>
                  </div>
                )}
                {!ex.isCustom && isAdmin && <ExerciseDetailsEditor value={details} onChange={setDetails} library={library} self={ex} />}
                {ex.isCustom && <LessonFieldsEditor value={details.lesson} onChange={(lesson) => setDetails({ ...details, lesson })} />}
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={save} disabled={busy} className="flex-1">
                    {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}{t("save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
                </div>
              </>
            ) : (
              <>
                {exerciseDescription(ex, locale) && <p className="text-sm text-muted-foreground">{exerciseDescription(ex, locale)}</p>}
                {(demoVideo(ex.videoUrl) ?? ex.videoUrl) && <VideoEmbed url={(demoVideo(ex.videoUrl) ?? ex.videoUrl)!} />}
                <ExerciseDetails ex={ex} library={library} />
                <Link href={`/exercises/${ex.id}`} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-text">
                  <History className="h-4 w-4" aria-hidden="true" />
                  {t("myHistory")}
                </Link>
                {!hasDetail && !ex.isCustom && (
                  <p className="text-xs text-muted-foreground">{ex.equipment ?? ""}</p>
                )}
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <Button size="xs" variant="outline" onClick={() => setEditing(true)}>
                      <Pencil className="mr-1 h-3 w-3" />{t("edit")}
                    </Button>
                    {ex.isCustom && (
                      <Button size="xs" variant="ghost" className="text-destructive" onClick={() => ex.id && deleteExercise(ex.id)}>
                        <Trash2 className="mr-1 h-3 w-3" />{t("delete")}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

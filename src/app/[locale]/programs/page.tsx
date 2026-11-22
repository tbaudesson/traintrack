"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePrograms, createProgram } from "@/hooks/usePrograms";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { getAiConsent, getApiKey, generateProgram } from "@/lib/aiService";
import { AiConsent } from "@/components/domain/AiConsent";
import { PROGRAM_TEMPLATES, type ProgramTemplate } from "@/lib/programTemplates";
import { planWeeks, programCategory } from "@/lib/programCategories";
import type { ProgramDay } from "@/db";
import { CategoryIcon, ProgramCatalog } from "@/components/domain/ProgramCatalog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ClipboardList, Loader2, UserCheck, Sparkles, FileSpreadsheet, Archive, Star } from "lucide-react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useFormat } from "@/lib/format";
import { byUse, lastUsed } from "@/lib/reuse";
import { search } from "@/lib/search";
import { SearchField } from "@/components/ui/find";
import { ProgramImportDialog } from "@/components/domain/ProgramImportDialog";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";
import { useClients } from "@/hooks/useClients";
import { useProgramTemplates, useReadyMadeNames } from "@/lib/templateService";
import { programFingerprint, programOrigin } from "@/lib/programOrigin";
import { useAppPrefs } from "@/hooks/useAppPrefs";

export default function ProgramsPage() {
  const { clients } = useClients();
  const t = useTranslations("programs");
  const tf = useTranslations("picker");
  const { day: dayLabel } = useFormat();
  const workouts = useWorkouts();
  const used = useMemo(() => lastUsed(workouts), [workouts]);
  const [query, setQuery] = useState("");
  const tai = useTranslations("ai");
  const router = useRouter();
  const programs = usePrograms();
  const { user } = useAuth();
  const { hasFeature } = useFeatureAccess();
  const profile = useAthleteProfile();
  const tc = useTranslations("catalog");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);

  const catalogue = useProgramTemplates();
  const prefs = useAppPrefs();

  async function applyTemplate(tpl: ProgramTemplate) {
    setBusy(true);
    const id = await createProgram({
      name: tpl.name,
      description: tpl.description,
      structure: tpl.structure,
    });
    setBusy(false);
    router.push(`/programs/${id}`);
  }

  /** "Running · 8 weeks", or the number of days of a program without weeks. */
  function describe(p: { name: string; structure?: ProgramDay[] }) {
    const category = programCategory(p, [...catalogue, ...PROGRAM_TEMPLATES]);
    const weeks = planWeeks(p.structure ?? []);
    const length = weeks ? tc("weeks", { count: weeks }) : `${(p.structure ?? []).length} ${t("days")}`;
    return { category, subtitle: category ? `${tc(`cat_${category}`)} · ${length}` : length };
  }

  // AI generation dialog state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiConsented, setAiConsented] = useState(false);
  const [goal, setGoal] = useState("hypertrophy");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const [experience, setExperience] = useState("intermediate");
  const [focus, setFocus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleCreate() {
    setBusy(true);
    const id = await createProgram({ name: t("untitled"), structure: [{ name: t("day") + " 1", exercises: [] }] });
    router.push(`/programs/${id}/edit`);
  }

  function openAi() {
    setAiError(null);
    setAiConsented(!!getAiConsent());
    if (profile?.goals?.[0]) setGoal(profile.goals[0]);
    if (profile?.fitnessLevel) setExperience(profile.fitnessLevel);
    setAiOpen(true);
  }

  async function handleGenerate() {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAiError(tai("needKey"));
      return;
    }
    setGenerating(true);
    setAiError(null);
    try {
      const result = await generateProgram(
        {
          goal,
          daysPerWeek: Number(daysPerWeek) || 4,
          experience,
          equipment: profile?.equipment ?? [],
          focus: focus.trim() || undefined,
        },
        apiKey
      );
      const id = await createProgram({
        name: result.name,
        description: result.description,
        structure: result.structure,
      });
      setAiOpen(false);
      router.push(`/programs/${id}/edit`);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setAiError(
        code === "AI_BAD_KEY"
          ? tai("errBadKey")
          : code === "AI_RATE_LIMIT"
            ? tai("errRate")
            : code || tai("errGeneric")
      );
    } finally {
      setGenerating(false);
    }
  }

  const mine = programs.filter((p) => !p.assignedToUserId || p.assignedToUserId === user?.id);
  const toClients = programs.filter((p) => p.assignedToUserId && p.assignedToUserId !== user?.id);
  const clientName = (id?: string | null) => clients.find((c) => c.userId === id)?.displayName ?? "—";
  const readyMade = useReadyMadeNames();
  // Favourites, then the last used, narrowed by the search; the archived apart.
  const matching = search(byUse(mine, used), query, (p) => ({ names: [p.name], others: [p.description, describe(p).subtitle] }));
  const active = matching.filter((p) => !p.archivedAt);
  const archived = matching.filter((p) => p.archivedAt);
  const followed = active.filter((p) => programOrigin(p, user?.id, readyMade) !== "mine");
  const created = active.filter((p) => programOrigin(p, user?.id, readyMade) === "mine");
  /** "Running · 8 weeks · last session 12 Nov", a star for a favourite. */
  const rowOf = (p: (typeof mine)[number], extra?: string) => {
    const { category, subtitle } = describe(p);
    const last = p.id ? used.get(p.id) : undefined;
    return (
      <DetailRow
        key={p.id}
        onClick={() => router.push(`/programs/${p.id}`)}
        leading={<CategoryIcon category={category ?? "custom"} />}
        title={p.name}
        subtitle={
          <>
            {p.favorite && <Star className="mr-1 inline h-3.5 w-3.5 -translate-y-px fill-amber-400 text-amber-500" role="img" aria-label={t("favoriteMark")} />}
            {[subtitle, extra, last ? t("lastSession", { date: dayLabel(last) }) : null].filter(Boolean).join(" · ")}
          </>
        }
      />
    );
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {hasFeature("ai_programs") && (
              <Button size="sm" variant="outline" onClick={openAi}>
                <Sparkles className="mr-1 h-4 w-4" />
                {tai("generate")}
              </Button>
            )}
            {hasFeature("excel_import") && (
              <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
                <FileSpreadsheet className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("importExcel")}
              </Button>
            )}
            <Button size="sm" onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />{t("create")}</>}
            </Button>
          </div>
        }
      />
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-6">
        {/* One's own programs first: those followed, then those built. */}
        {/* Programs followed as they are: ready-made ones and a coach's. */}
        {mine.length > 3 && <SearchField value={query} onChange={setQuery} placeholder={t("searchMine")} clearLabel={tf("clear")} />}
        {query && !matching.length && (
          <div className="space-y-2 py-4 text-center text-sm text-muted-foreground">
            <p>{tf("none")}</p>
            <Button variant="outline" size="sm" onClick={() => setQuery("")}>{tf("reset")}</Button>
          </div>
        )}
        {followed.length > 0 && (
          <section className="space-y-2">
            <SectionHeading>{t("followed")}</SectionHeading>
            {followed.map((p) => rowOf(p, t(programOrigin(p, user?.id, readyMade) === "coach" ? "byCoach" : "readyMade")))}
          </section>
        )}
        {/* Programs one built: edited freely. */}
        {created.length > 0 && (
          <section className="space-y-2">
            <SectionHeading>{t("myCreations")}</SectionHeading>
            {created.map((p) => rowOf(p))}
          </section>
        )}
        {archived.length > 0 && (
          <details className="t-panel rounded-xl px-4 py-1" open={!!query}>
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
              <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
              {t("archived", { count: archived.length })}
            </summary>
            <div className="space-y-2 pt-1 pb-3">{archived.map((p) => rowOf(p))}</div>
          </details>
        )}
        <ProgramCatalog
          templates={catalogue}
          level={profile?.fitnessLevel}
          busy={busy}
          onUse={applyTemplate}
          favorite={prefs.sport}
          added={(tpl) => (mine.find((p) => p.name === tpl.name) ?? mine.find((p) => programFingerprint(p.structure) === programFingerprint(tpl.structure)))?.id}
        />

        {created.length === 0 && !query && (
          <section className="space-y-2">
            <SectionHeading>{t("myCreations")}</SectionHeading>
            <EmptyState icon={ClipboardList} title={t("noCreations")} />
          </section>
        )}

        {toClients.length > 0 && (
          <section className="space-y-2">
            <SectionHeading>{t("assignedToClients")}</SectionHeading>
            {toClients.map((p) => (
              <DetailRow
                key={p.id}
                onClick={() => router.push(`/programs/${p.id}`)}
                icon={UserCheck}
                tone="neutral"
                title={p.name}
                subtitle={clientName(p.assignedToUserId)}
              />
            ))}
          </section>
        )}
      </div>

      {/* AI generation dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent-500" />
              {tai("generateTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{tai("goal")}</label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{tai("daysPerWeek")}</label>
                <Input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{tai("experience")}</label>
                <Input value={experience} onChange={(e) => setExperience(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{tai("focus")}</label>
              <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder={tai("focusPlaceholder")} />
            </div>
            {aiError && (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{aiError}</p>
            )}
            {aiConsented ? (
              <Button className="w-full" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <><Loader2 className="mr-1 h-4 w-4 animate-spin" />{tai("generating")}</>
                ) : (
                  <><Sparkles className="mr-1 h-4 w-4" />{tai("generateBtn")}</>
                )}
              </Button>
            ) : (
              <AiConsent sends="program" onAccept={() => setAiConsented(true)} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProgramImportDialog open={importing && hasFeature("excel_import")} onOpenChange={setImporting} />
    </>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePrograms, createProgram } from "@/hooks/usePrograms";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { getApiKey, generateProgram } from "@/lib/aiService";
import { rankTemplates, type ProgramGoal, type ProgramLevel } from "@/lib/programTemplates";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ClipboardList, Loader2, UserCheck, Sparkles, LayoutTemplate, Dumbbell, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";
import { useClients } from "@/hooks/useClients";
import { useProgramTemplates } from "@/lib/templateService";

export default function ProgramsPage() {
  const { clients } = useClients();
  const t = useTranslations("programs");
  const tai = useTranslations("ai");
  const router = useRouter();
  const programs = usePrograms();
  const { user } = useAuth();
  const { hasFeature } = useFeatureAccess();
  const profile = useAthleteProfile();
  const tt = useTranslations("templates");
  const [busy, setBusy] = useState(false);

  // Template picker state
  const [tplOpen, setTplOpen] = useState(false);
  const [tGoal, setTGoal] = useState<ProgramGoal | undefined>(undefined);
  const [tLevel, setTLevel] = useState<ProgramLevel | undefined>(undefined);
  const [tDays, setTDays] = useState<number | undefined>(undefined);

  const catalogue = useProgramTemplates();
  const ranked = rankTemplates({ goal: tGoal, level: tLevel, daysPerWeek: tDays }, catalogue);

  function openTemplates() {
    if (profile?.fitnessLevel) setTLevel(profile.fitnessLevel as ProgramLevel);
    setTplOpen(true);
  }

  async function applyTemplate(tplId: string) {
    const tpl = ranked.find((x) => x.id === tplId);
    if (!tpl) return;
    setBusy(true);
    const id = await createProgram({
      name: tpl.name,
      description: tpl.description,
      structure: tpl.structure,
    });
    setTplOpen(false);
    setBusy(false);
    router.push(`/programs/${id}`);
  }

  // AI generation dialog state
  const [aiOpen, setAiOpen] = useState(false);
  const [goal, setGoal] = useState("hypertrophy");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const [experience, setExperience] = useState("intermediate");
  const [focus, setFocus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleCreate() {
    setBusy(true);
    const id = await createProgram({ name: t("untitled"), structure: [{ name: t("day") + " 1", exercises: [] }] });
    router.push(`/programs/${id}`);
  }

  function openAi() {
    setAiError(null);
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
      router.push(`/programs/${id}`);
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
  const assignedToMe = programs.filter((p) => p.assignedToUserId === user?.id && p.ownerUserId !== user?.id);

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" onClick={openTemplates}>
              <LayoutTemplate className="mr-1 h-4 w-4" />
              {tt("choose")}
            </Button>
            {hasFeature("ai_programs") && (
              <Button size="sm" variant="outline" onClick={openAi}>
                <Sparkles className="mr-1 h-4 w-4" />
                {tai("generate")}
              </Button>
            )}
            <Button size="sm" onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />{t("create")}</>}
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-4 pb-24">
        {assignedToMe.length > 0 && (
          <section className="space-y-2">
            <SectionHeading>{t("assignedToMe")}</SectionHeading>
            {assignedToMe.map((p) => (
              <DetailRow
                key={p.id}
                icon={UserCheck}
                tone="success"
                title={p.name}
                subtitle={`${(p.structure ?? []).length} ${t("days")}`}
              />
            ))}
          </section>
        )}

        <section className="space-y-2">
          <SectionHeading>{t("myPrograms")}</SectionHeading>
          {mine.length === 0 ? (
            <EmptyState icon={ClipboardList} title={t("noPrograms")} />
          ) : (
            mine.map((p) => (
              <DetailRow
                key={p.id}
                onClick={() => router.push(`/programs/${p.id}`)}
                icon={ClipboardList}
                title={p.name}
                subtitle={`${(p.structure ?? []).length} ${t("days")}${p.assignedToUserId ? ` · ${t("assigned")}` : ""}`}
              />
            ))
          )}
        </section>

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
            <Button className="w-full" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" />{tai("generating")}</>
              ) : (
                <><Sparkles className="mr-1 h-4 w-4" />{tai("generateBtn")}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template picker */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-accent-500" />
              {tt("title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{tt("subtitle")}</p>

          <div className="space-y-3 py-1">
            <FilterRow label={tt("goal")}>
              {(["strength", "hypertrophy", "fat_loss", "general"] as ProgramGoal[]).map((g) => (
                <Chip key={g} active={tGoal === g} onClick={() => setTGoal(tGoal === g ? undefined : g)}>{tt(`goal_${g}`)}</Chip>
              ))}
            </FilterRow>
            <FilterRow label={tt("level")}>
              {(["beginner", "intermediate", "advanced"] as ProgramLevel[]).map((l) => (
                <Chip key={l} active={tLevel === l} onClick={() => setTLevel(tLevel === l ? undefined : l)}>{tt(`level_${l}`)}</Chip>
              ))}
            </FilterRow>
            <FilterRow label={tt("days")}>
              {[3, 4, 6].map((d) => (
                <Chip key={d} active={tDays === d} onClick={() => setTDays(tDays === d ? undefined : d)}>{d}</Chip>
              ))}
            </FilterRow>
          </div>

          <div className="space-y-2">
            {ranked.map((tpl) => (
              <Card key={tpl.id}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-900/30">
                      {tpl.homeFriendly ? <Home className="h-4 w-4 text-accent-text" /> : <Dumbbell className="h-4 w-4 text-accent-text" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground">{tpl.description}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Tag>{tt(`goal_${tpl.goal}`)}</Tag>
                        <Tag>{tt(`level_${tpl.level}`)}</Tag>
                        <Tag>{tpl.daysPerWeek} {tt("daysShort")}</Tag>
                        <Tag>{tpl.structure.length} {t("days")}</Tag>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="mt-2 w-full" onClick={() => applyTemplate(tpl.id)} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : tt("use")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs",
        active ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40" : "border-border text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{children}</span>;
}

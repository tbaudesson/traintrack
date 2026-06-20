"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePrograms, createProgram } from "@/hooks/usePrograms";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { getApiKey, generateProgram } from "@/lib/aiService";
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
import { Plus, ClipboardList, ChevronRight, Loader2, UserCheck, Sparkles } from "lucide-react";

export default function ProgramsPage() {
  const t = useTranslations("programs");
  const tai = useTranslations("ai");
  const router = useRouter();
  const programs = usePrograms();
  const { user } = useAuth();
  const profile = useAthleteProfile();
  const [busy, setBusy] = useState(false);

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

  const mine = programs.filter((p) => !p.assignedToUserId || p.ownerUserId === user?.id);
  const assignedToMe = programs.filter((p) => p.assignedToUserId === user?.id && p.ownerUserId !== user?.id);

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={openAi}>
              <Sparkles className="mr-1 h-4 w-4" />
              {tai("generate")}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />{t("create")}</>}
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-4 pb-24">
        {assignedToMe.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{t("assignedToMe")}</h2>
            {assignedToMe.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{(p.structure ?? []).length} {t("days")}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("myPrograms")}</h2>
          {mine.length === 0 ? (
            <p className="rounded-lg bg-card/60 py-6 text-center text-sm text-muted-foreground">{t("noPrograms")}</p>
          ) : (
            mine.map((p) => (
              <Card key={p.id}>
                <CardContent className="py-0">
                  <button onClick={() => router.push(`/programs/${p.id}`)} className="flex w-full items-center gap-3 py-3 text-left">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      <ClipboardList className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(p.structure ?? []).length} {t("days")}
                        {p.assignedToUserId ? ` · ${t("assigned")}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </button>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>

      {/* AI generation dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
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
    </>
  );
}

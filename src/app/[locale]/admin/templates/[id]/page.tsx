"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";
import type { ProgramDay } from "@/db";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { ProgramDaysEditor } from "@/components/domain/ProgramDaysEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProgramGoal, ProgramLevel } from "@/lib/programTemplates";
import { getTemplate, updateTemplate, type AdminTemplate } from "@/lib/templateService";
import { PLAN_LOCALES, type PlanLocale } from "@/lib/enduranceText";

const GOALS: ProgramGoal[] = ["strength", "hypertrophy", "endurance", "fat_loss", "general"];
const LEVELS: ProgramLevel[] = ["beginner", "intermediate", "advanced"];
const SELECT = "mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base";

/** Admin: edit one ready-made program. */
export default function TemplateEditorPage() {
  const t = useTranslations("adminTemplates");
  const tl = useTranslations("templates");
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const id = useParams().id as string;

  const [item, setItem] = useState<AdminTemplate | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/");
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    getTemplate(id)
      .then((found) => {
        setItem(found);
        setDays(found?.structure ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, [id, isAdmin]);

  const patch = (change: Partial<AdminTemplate>) => setItem((current) => (current ? { ...current, ...change } : current));

  async function save() {
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      await updateTemplate(id, { ...item, name: item.name.trim() || t("untitled"), structure: days });
      router.push("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  if (!isAdmin) return null;
  if (!item) {
    return (
      <div className="flex justify-center p-10">
        {error ? <p className="text-sm text-destructive">{error}</p> : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t("edit")}
        showBack
        actions={
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-1 h-4 w-4" aria-hidden="true" />}
            {t("save")}
          </Button>
        }
      />
      <div className="space-y-4 p-4 pb-28">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Card>
          <CardContent className="space-y-3 py-4">
            <label className="block text-sm font-medium">
              {t("name")}
              <Input value={item.name} onChange={(e) => patch({ name: e.target.value })} className="mt-1" />
            </label>
            <label className="block text-sm font-medium">
              {t("description")}
              <Input value={item.description} onChange={(e) => patch({ description: e.target.value })} className="mt-1" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                {tl("goal")}
                <select value={item.goal} onChange={(e) => patch({ goal: e.target.value as ProgramGoal })} className={SELECT}>
                  {GOALS.map((g) => <option key={g} value={g}>{tl(`goal_${g}`)}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">
                {tl("level")}
                <select value={item.level} onChange={(e) => patch({ level: e.target.value as ProgramLevel })} className={SELECT}>
                  {LEVELS.map((l) => <option key={l} value={l}>{tl(`level_${l}`)}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium">
              {t("language")}
              <select
                value={item.locale ?? ""}
                onChange={(e) => patch({ locale: (e.target.value || undefined) as PlanLocale | undefined })}
                className={SELECT}
              >
                <option value="">{t("allLanguages")}</option>
                {PLAN_LOCALES.map((l) => <option key={l} value={l}>{t(`language_${l}`)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              {tl("days")}
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={7}
                value={item.daysPerWeek}
                onChange={(e) => patch({ daysPerWeek: Number(e.target.value) })}
                className="mt-1"
              />
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={!!item.homeFriendly} onChange={(e) => patch({ homeFriendly: e.target.checked })} className="size-5" />
              {t("homeFriendly")}
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={item.isPublished} onChange={(e) => patch({ isPublished: e.target.checked })} className="size-5" />
              {t("published")}
            </label>
          </CardContent>
        </Card>

        <ProgramDaysEditor days={days} setDays={setDays} />
      </div>
    </>
  );
}

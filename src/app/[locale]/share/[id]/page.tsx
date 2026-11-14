"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Share2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createProgram } from "@/hooks/usePrograms";
import { describeTarget } from "@/lib/cardio";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { planWeeks, programCategory } from "@/lib/programCategories";
import { getSharedProgram, type SharedProgram } from "@/lib/shareService";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/domain/ProgramCatalog";

/** A program someone shared by link: what it holds, and a tap to add it to one's own. */
export default function SharedProgramPage() {
  const t = useTranslations("share");
  const tc = useTranslations("catalog");
  const xl = useExerciseLabel();
  const router = useRouter();
  const id = String(useParams().id);
  const [shared, setShared] = useState<SharedProgram | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getSharedProgram(id)
      .then(setShared)
      .catch(() => setError(true));
  }, [id]);

  async function add() {
    if (!shared) return;
    setAdding(true);
    try {
      const programId = await createProgram({ name: shared.name, description: shared.description ?? undefined, structure: shared.structure });
      router.push(`/programs/${programId}`);
    } finally {
      setAdding(false);
    }
  }

  if (shared === undefined && !error) {
    return (
      <>
        <PageHeader title={t("title")} showBack />
        <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </>
    );
  }

  if (!shared) {
    return (
      <>
        <PageHeader title={t("title")} showBack />
        <div className="p-4">
          <EmptyState icon={Share2} title={t(error ? "offline" : "notFound")} />
        </div>
      </>
    );
  }

  const category = programCategory({ name: shared.name, structure: shared.structure });
  const weeks = planWeeks(shared.structure);

  return (
    <>
      <PageHeader title={shared.name} showBack />
      <div className="space-y-4 p-4 pb-28">
        <section className="t-hero space-y-3 rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <CategoryIcon category={category ?? "custom"} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("sharedBy", { name: shared.sharedBy })}</p>
              <p className="text-xs text-muted-foreground">
                {[category && tc(`cat_${category}`), weeks ? tc("weeks", { count: weeks }) : t("days", { count: shared.structure.length })].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {shared.description && <p className="text-sm text-muted-foreground">{shared.description}</p>}
          <Button size="lg" className="w-full rounded-full" onClick={add} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <><Plus className="mr-1 h-4 w-4" aria-hidden="true" />{t("add")}</>}
          </Button>
        </section>

        <ul className="space-y-1.5">
          {shared.structure.slice(0, weeks ? 7 : 20).map((d, i) => (
            <li key={i} className="t-surface rounded-xl p-3 text-sm ring-1 ring-foreground/5">
              <p className="font-medium">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {d.cardio ? describeTarget(d.cardio) : d.exercises.map((e) => xl(e.exerciseName)).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
        {weeks && shared.structure.length > 7 && <p className="text-center text-xs text-muted-foreground">{t("more", { count: shared.structure.length - 7 })}</p>}
      </div>
    </>
  );
}

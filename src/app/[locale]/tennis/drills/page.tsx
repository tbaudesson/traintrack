"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import type { TennisDrill } from "@/db";
import { useAuth } from "@/contexts/AuthContext";
import { useTennisDrills } from "@/hooks/useTennis";
import { drillText } from "@/lib/tennis";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { RequireFeature } from "@/components/domain/UpgradeNotice";
import { DrillDialog, DrillList } from "@/components/domain/TennisDialogs";

/**
 * The tennis drills: the library and one's own. One's own drills are changed
 * here; the library's by an admin only (for everyone, online).
 */
function DrillsContent() {
  const t = useTranslations("tennis");
  const locale = useLocale();
  const { isAdmin } = useAuth();
  const drills = useTennisDrills();
  const [editing, setEditing] = useState<Partial<TennisDrill> | null>(null);
  return (
    <>
      <PageHeader
        title={t("drillsTitle")}
        showBack
        actions={
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus className="mr-1 size-4" aria-hidden="true" />
            {t("newDrill")}
          </Button>
        }
      />
      <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col gap-3 p-4 pb-28 md:p-6">
        <p className="text-sm text-muted-foreground">{t(isAdmin ? "drillsIntroAdmin" : "drillsIntro")}</p>
        {!drills ? (
          <div className="flex justify-center py-10" role="status">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : (
          <DrillList
            drills={drills}
            // A library drill, for a coach: a copy of it to make one's own, in one's language.
            onPick={(d) =>
              d.userId || isAdmin
                ? setEditing(d)
                : setEditing({ category: d.category, minutes: d.minutes, ages: d.ages, equipment: d.equipment, name: drillText(d, locale).name, description: drillText(d, locale).description })
            }
            pickLabel={(name) => t("openNamed", { name })}
          />
        )}
      </div>
      <DrillDialog drill={editing} admin={!!isAdmin} onClose={() => setEditing(null)} />
    </>
  );
}

export default function TennisDrillsPage() {
  return (
    <RequireFeature feature="tennis" namespace="tennis">
      <DrillsContent />
    </RequireFeature>
  );
}

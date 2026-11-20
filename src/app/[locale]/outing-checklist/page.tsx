"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { OutingChecklist } from "@/components/domain/OutingChecklist";

/** The pre-departure checklist, for the next outing on foot. */
export default function OutingChecklistPage() {
  const t = useTranslations("outingChecklist");
  return (
    <>
      <PageHeader title={t("pageTitle")} />
      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-28">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <div className="t-surface rounded-2xl p-4 ring-1 ring-foreground/5">
          <OutingChecklist storageKey="next-outing" />
        </div>
      </div>
    </>
  );
}

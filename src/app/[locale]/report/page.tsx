"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyReportView } from "@/components/domain/MonthlyReportView";
import { RequireFeature } from "@/components/domain/UpgradeNotice";

/** The athlete's own monthly report. */
function MonthlyReportPageContent() {
  const t = useTranslations("monthly");
  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="p-4 pb-28">
        <MonthlyReportView />
      </div>
    </>
  );
}

export default function MonthlyReportPage() {
  return (
    <RequireFeature feature="reports" namespace="monthly">
      <MonthlyReportPageContent />
    </RequireFeature>
  );
}

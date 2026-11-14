"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyReportView } from "@/components/domain/MonthlyReportView";

/** The athlete's own monthly report. */
export default function MonthlyReportPage() {
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

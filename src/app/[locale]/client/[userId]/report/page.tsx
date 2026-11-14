"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useClients } from "@/hooks/useClients";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyReportView } from "@/components/domain/MonthlyReportView";

/** A client's monthly report, as the coach sends it. */
export default function ClientMonthlyReportPage() {
  const t = useTranslations("monthly");
  const userId = useParams().userId as string;
  const { clients } = useClients();
  const name = clients.find((c) => c.userId === userId)?.displayName;
  return (
    <>
      <PageHeader title={name ? t("titleOf", { name }) : t("title")} showBack />
      <div className="p-4 pb-28">
        <MonthlyReportView userId={userId} name={name} />
      </div>
    </>
  );
}

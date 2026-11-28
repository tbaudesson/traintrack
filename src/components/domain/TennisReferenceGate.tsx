"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useTennisReference } from "@/hooks/useTennisReference";
import type { TennisReference } from "@/lib/tennisReference";
import { PageHeader } from "@/components/layout/PageHeader";

/**
 * A page of the tennis notebook, once the reference the admin keeps (themes,
 * ages, levels, equipment) has been read: online once, then kept on the device.
 */
export function TennisReferenceGate({ children }: { children: (reference: TennisReference) => ReactNode }) {
  const t = useTranslations("tennis");
  const reference = useTennisReference();
  if (!reference) {
    return (
      <>
        <PageHeader title={t("title")} showBack />
        <p role="status" className="mx-auto max-w-3xl p-4 text-sm text-muted-foreground">{t("notLoaded")}</p>
      </>
    );
  }
  return <>{children(reference)}</>;
}

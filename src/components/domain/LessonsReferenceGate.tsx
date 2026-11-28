"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useLessonsReference } from "@/hooks/useLessonsReference";
import type { LessonsReference } from "@/lib/lessonsReference";
import { PageHeader } from "@/components/layout/PageHeader";

/**
 * A page of the group lessons' notebook, once the reference the admin keeps
 * (sports, themes, ages, levels, equipment) has been read: online once, then
 * kept on the device.
 */
export function LessonsReferenceGate({ children }: { children: (reference: LessonsReference) => ReactNode }) {
  const t = useTranslations("lessons");
  const reference = useLessonsReference();
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

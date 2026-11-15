"use client";

import { useTranslations } from "next-intl";
import type { NavigationSectionDef } from "@/lib/navConfig";

export function NavigationBreadcrumb({ section, onRoot }: { section?: NavigationSectionDef; onRoot: () => void }) {
  const t = useTranslations("nav");
  if (!section) return null;
  return <div aria-label={t("breadcrumbLabel")} className="flex items-center gap-2 text-sm text-muted-foreground"><button type="button" onClick={onRoot} className="hover:text-foreground">{t("allSections")}</button><span aria-hidden="true">/</span><span aria-current="page" className="text-foreground">{t(section.key)}</span></div>;
}

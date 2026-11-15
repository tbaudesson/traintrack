"use client";

import { useTranslations } from "next-intl";
import { Home } from "lucide-react";
import { CircularNavigation } from "./CircularNavigation";
import { navigationIcon } from "./navigationIcons";
import type { NavigationSectionDef } from "@/lib/navConfig";

export function GlobalNavigationWheel({ sections, onSelect, onHome }: { sections: readonly NavigationSectionDef[]; onSelect: (id: NavigationSectionDef["id"]) => void; onHome: () => void }) {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  return <CircularNavigation ariaLabel={common("mainNav")} items={sections.map((section) => ({ id: section.id, label: t(section.key), icon: navigationIcon(section.icon) }))} centre={<Home className="size-7" />} centreLabel={t("home")} onCentre={onHome} onSelect={(id) => onSelect(id as NavigationSectionDef["id"])} renderLink={(_item, children) => <button type="button">{children}</button>} />;
}

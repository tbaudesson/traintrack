"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CircularNavigation } from "./CircularNavigation";
import { navigationIcon } from "./navigationIcons";
import type { NavigationSectionDef } from "@/lib/navConfig";

export function SectionNavigationWheel({ section, pathname, onBack }: { section: NavigationSectionDef; pathname: string; onBack: () => void }) {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  return <CircularNavigation ariaLabel={t(section.key)} items={section.children.map((item) => ({ id: item.id, href: item.href, label: t(item.key), icon: navigationIcon(item.icon), current: item.href === "/" ? pathname === "/" : pathname.startsWith(item.href) }))} centre={<ChevronLeft className="size-7" />} centreLabel={common("back")} onCentre={onBack} renderLink={(item, children) => <Link href={item.href!} draggable={false}>{children}</Link>} />;
}

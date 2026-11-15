"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { NavigationSectionDef } from "@/lib/navConfig";
import { navigationIcon } from "./navigationIcons";

export function NavigationListFallback({ sections }: { sections: readonly NavigationSectionDef[] }) {
  const t = useTranslations("nav");
  const [query, setQuery] = useState("");
  const items = useMemo(() => sections.flatMap((section) => section.children.map((item) => ({ ...item, section }))).filter((item) => `${t(item.key)} ${t(item.section.key)}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [query, sections, t]);
  return <div className="w-full space-y-3"><label className="sr-only" htmlFor="nav-search">{t("searchNavigation")}</label><input id="nav-search" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder={t("searchNavigation")} className="w-full rounded-xl border bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" /><ul role="list" className="grid max-h-64 gap-1 overflow-auto">{items.map((item) => <li key={`${item.section.id}-${item.id}`}><Link href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><span aria-hidden="true">{navigationIcon(item.icon)}</span><span>{t(item.key)}</span><span className="ml-auto text-xs text-muted-foreground">{t(item.section.key)}</span></Link></li>)}</ul></div>;
}

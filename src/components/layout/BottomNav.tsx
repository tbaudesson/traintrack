"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getNavigationPreferences, navigationForAccess, sectionForPath, type NavigationSectionId } from "@/lib/navConfig";
import { GlobalNavigationWheel } from "@/components/navigation/GlobalNavigationWheel";
import { SectionNavigationWheel } from "@/components/navigation/SectionNavigationWheel";
import { NavigationBreadcrumb } from "@/components/navigation/NavigationBreadcrumb";
import { NavigationListFallback } from "@/components/navigation/NavigationListFallback";
import { useGlobalNavigationHidden } from "@/hooks/useSessionFocus";

/** Bottom launcher for the reusable two-level circular navigation. */
export function BottomNav() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, planFeatures } = useAuth();
  const [open, setOpen] = useState(false);
  const [listMode, setListMode] = useState(false);
  const [selected, setSelected] = useState<NavigationSectionId | null>(null);
  const [preferenceVersion, setPreferenceVersion] = useState(0);
  // During an active session the wheel is gone, and it comes back closed.
  const hidden = useGlobalNavigationHidden();
  if (hidden && open) setOpen(false);

  useEffect(() => {
    const sync = () => setPreferenceVersion((value) => value + 1);
    window.addEventListener("navitemschange", sync);
    return () => window.removeEventListener("navitemschange", sync);
  }, []);
  const prefs = getNavigationPreferences();
  const accessible = navigationForAccess({ role: isAdmin ? "admin" : "user", isAdmin, features: planFeatures });
  const sections = prefs.sectionOrder.map((id) => accessible.find((entry) => entry.id === id)).filter((entry): entry is NonNullable<typeof entry> => !!entry && !prefs.hiddenSections.includes(entry.id));
  void preferenceVersion;
  const routeSection = sectionForPath(pathname);
  const section = sections.find((entry) => entry.id === selected) ?? sections.find((entry) => entry.id === routeSection?.id);

  if (hidden) return null;
  return <>
    {open && <button type="button" aria-label={common("close")} className="t-arc-scrim fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    {open && <aside onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }} className="t-nav-panel fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md flex-col items-center gap-3 rounded-[2rem] border bg-[var(--nav-panel)] p-4 shadow-2xl backdrop-blur-xl" aria-label={common("mainNav")}>
      <div className="flex w-full items-center justify-between"><NavigationBreadcrumb section={selected ? section : undefined} onRoot={() => setSelected(null)} /><button type="button" onClick={() => setListMode((value) => !value)} className="rounded-full p-2 hover:bg-muted" aria-label={t("toggleList")} aria-pressed={listMode}><Menu className="size-5" /></button></div>
      {listMode ? <NavigationListFallback sections={sections} /> : selected && section ? <SectionNavigationWheel section={section} pathname={pathname} onBack={() => setSelected(null)} /> : <GlobalNavigationWheel sections={sections} onSelect={setSelected} onHome={() => { setOpen(false); router.push("/"); }} />}
    </aside>}
    <div className="safe-area-pb fixed inset-x-0 bottom-3 z-50 flex justify-center pointer-events-none"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? common("close") : common("openNav")} className="t-arc-hub pointer-events-auto flex size-16 items-center justify-center rounded-full shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">{open ? <X className="size-7" /> : <Menu className="size-7" />}</button></div>
  </>;
}

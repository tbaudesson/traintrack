"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { currentItemId, getNavigationPreferences, navigationForAccess, sectionForPath, type NavigationSectionId } from "@/lib/navConfig";
import { GlobalNavigationWheel } from "@/components/navigation/GlobalNavigationWheel";
import { SectionNavigationWheel } from "@/components/navigation/SectionNavigationWheel";
import { NavigationBreadcrumb } from "@/components/navigation/NavigationBreadcrumb";
import { NavigationListFallback } from "@/components/navigation/NavigationListFallback";
import { PerformanceDial } from "@/components/navigation/PerformanceDial";
import { useGlobalNavigationHidden } from "@/hooks/useSessionFocus";
import { navigationIcon } from "@/components/navigation/navigationIcons";
import { useAppPrefs } from "@/hooks/useAppPrefs";

// The desktop rail exists only where it shows: Dynamic, from 1024 px.
const WIDE = "(min-width: 1024px)";
const subscribeWide = (callback: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const isWide = () => window.matchMedia(WIDE).matches;

/** Bottom launcher for the reusable two-level circular navigation. */
export function BottomNav() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listMode, setListMode] = useState(false);
  const [selected, setSelected] = useState<NavigationSectionId | null>(null);
  // During an active session the wheel is gone, and it comes back closed.
  const hidden = useGlobalNavigationHidden();
  if (hidden && open) setOpen(false);

  // Opened, the focus goes into the wheel (the panel comes before the button in
  // the page, so Tab alone would not reach it); Escape closes it and gives the
  // focus back to the button.
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>("nav") ?? panel?.querySelector<HTMLElement>("input, button"))?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const sections = useNavigationSections();
  const routeSection = sectionForPath(pathname);
  const section = sections.find((entry) => entry.id === selected) ?? sections.find((entry) => entry.id === routeSection?.id);
  const { style } = useAppPrefs();
  const dial = style === "dynamic";

  if (hidden) return null;
  return <>
    {open && <button type="button" aria-label={common("close")} className="t-arc-scrim fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    {open && <aside ref={panelRef} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }} className={`t-nav-panel fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md flex-col items-center gap-3 rounded-[2rem] border bg-[var(--nav-panel)] p-4 shadow-2xl backdrop-blur-xl${dial ? " t-nav-panel-dial" : ""}`} aria-label={common("mainNav")}>
      <div className="flex w-full items-center justify-between"><NavigationBreadcrumb section={selected ? section : undefined} onRoot={() => setSelected(null)} /><button type="button" onClick={() => setListMode((value) => !value)} className="rounded-full p-2 hover:bg-muted" aria-label={t("toggleList")} aria-pressed={listMode}><Menu className="size-5" /></button></div>
      {listMode ? <NavigationListFallback sections={sections} /> : dial ? <PerformanceDial sections={sections} activeId={selected ?? routeSection?.id ?? sections[0]?.id} pathname={pathname} onSelect={setSelected} onHome={() => { setOpen(false); router.push("/"); }} /> : selected && section ? <SectionNavigationWheel section={section} pathname={pathname} onBack={() => setSelected(null)} /> : <GlobalNavigationWheel sections={sections} onSelect={setSelected} onHome={() => { setOpen(false); router.push("/"); }} />}
    </aside>}
    <div className="t-nav-launcher safe-area-pb fixed inset-x-0 bottom-3 z-50 flex justify-center pointer-events-none"><button ref={toggleRef} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? common("close") : common("openNav")} className="t-arc-hub pointer-events-auto flex size-16 items-center justify-center rounded-full shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">{open ? <X className="size-7" /> : <Menu className="size-7" />}</button></div>
  </>;
}

/** The sections the user may see, in their order, without the hidden ones. */
function useNavigationSections() {
  const { isAdmin, planFeatures } = useAuth();
  const [preferenceVersion, setPreferenceVersion] = useState(0);
  useEffect(() => {
    const sync = () => setPreferenceVersion((value) => value + 1);
    window.addEventListener("navitemschange", sync);
    return () => window.removeEventListener("navitemschange", sync);
  }, []);
  void preferenceVersion;
  const prefs = getNavigationPreferences();
  const accessible = navigationForAccess({ role: isAdmin ? "admin" : "user", isAdmin, features: planFeatures });
  return prefs.sectionOrder.map((id) => accessible.find((entry) => entry.id === id)).filter((entry): entry is NonNullable<typeof entry> => !!entry && !prefs.hiddenSections.includes(entry.id));
}

/** Dynamic's desktop rail, placed before the page so the keyboard meets it first. */
export function DesktopRail() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const pathname = usePathname();
  const { style } = useAppPrefs();
  const wide = useSyncExternalStore(subscribeWide, isWide, () => false);
  const hidden = useGlobalNavigationHidden();
  const sections = useNavigationSections();
  if (hidden || style !== "dynamic" || !wide) return null;
  const routeSection = sectionForPath(pathname);
  const railSection = sections.find((entry) => entry.id === routeSection?.id) ?? sections[0];
  const railCurrent = railSection ? currentItemId(railSection, pathname) : undefined;
  return (
  <aside className="t-dynamic-rail fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-y-auto border-r border-border p-3" aria-label={common("mainNav")}>
    <Link href="/" className="flex min-h-14 items-center gap-3 rounded-xl px-2">
      <Image src="/icons/logo.png" alt="" width={38} height={38} unoptimized />
      <span className="t-wordmark text-xl"><span>Train</span>Track</span>
    </Link>
    <p className="t-kicker mb-2 mt-5 px-3">{common("mainNav")}</p>
    <nav className="space-y-1" aria-label={t("allSections")}>
      {sections.map((entry) => {
        const active = entry.id === railSection?.id;
        return (
          <Link key={entry.id} href={entry.children[0]?.href ?? "/"} aria-current={active ? "page" : undefined} className="t-rail-link flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold">
            <span className="flex size-8 items-center justify-center">{navigationIcon(entry.icon)}</span>
            <span>{t(entry.key)}</span>
          </Link>
        );
      })}
    </nav>
    {railSection && <div className="mt-6 border-t border-border/70 pt-4">
      <p className="t-kicker mb-2 px-3">{t(railSection.key)}</p>
      <nav className="space-y-0.5" aria-label={t(railSection.key)}>
        {railSection.children.map((item) => (
          <Link key={item.id} href={item.href} aria-current={item.id === railCurrent ? "page" : undefined} className="t-rail-sub-link flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm">
            <span className="text-accent-text">{navigationIcon(item.icon)}</span>
            <span>{t(item.key)}</span>
          </Link>
        ))}
      </nav>
    </div>}
  </aside>
  );
}

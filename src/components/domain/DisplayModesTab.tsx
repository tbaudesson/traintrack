"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { DISPLAY_KEY, DISPLAY_MODES, DISPLAY_PARTS, parseDisplayGuide, type DisplayGuide, type DisplayMode, type DisplayPage, type DisplayPart } from "@/lib/displayMode";
import { NAVIGATION_CATALOG } from "@/lib/navConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const select = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground";
const PAGES: DisplayPage[] = ["nav", "home", "progress", "log"];
const NAV_KEY = Object.fromEntries(NAVIGATION_CATALOG.flatMap((s) => s.children).map((item) => [item.id, item.key]));

/**
 * Which display mode shows each part of the app (app settings): a part set to
 * Essential shows in every mode, to Expert only in the Expert mode. What
 * keeps an athlete safe is not listed: it shows in every mode.
 */
export function DisplayModesTab() {
  const t = useTranslations("displayMode");
  const tnav = useTranslations("nav");
  const ts = useTranslations("sync");
  const [guide, setGuide] = useState<DisplayGuide | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseDisplayGuide(s[DISPLAY_KEY]);
        setGuide(parsed);
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing" || !guide) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("adminMissing")}</p>;

  const label = (page: DisplayPage, id: string) => (page === "nav" ? tnav(NAV_KEY[id]) : t(`part_${id}`));
  const set = (part: DisplayPart, mode: DisplayMode) => {
    const next = { ...guide };
    // Essential is the same as not listed: the part shows in every mode.
    if (mode === "essential") delete next[part];
    else next[part] = mode;
    setGuide(next);
    setSaved(false);
  };
  async function save() {
    setSaving(true);
    try {
      await setAppSetting(DISPLAY_KEY, JSON.stringify(guide, null, 2));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("adminTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("adminIntro")}</p>
      </div>
      {PAGES.map((page) => (
        <Card key={page}>
          <CardContent className="space-y-2 py-4">
            <h3 className="text-sm font-semibold">{t(`page_${page}`)}</h3>
            {DISPLAY_PARTS[page].map((id) => {
              const part = (page === "nav" ? `nav.${id}` : id) as DisplayPart;
              return (
                <label key={part} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-2 text-sm">
                  <span className="truncate">{label(page, id)}</span>
                  <select value={guide[part] ?? "essential"} onChange={(e) => set(part, e.target.value as DisplayMode)} className={select} aria-label={label(page, id)}>
                    {DISPLAY_MODES.map((m) => <option key={m} value={m}>{t(`mode_${m}`)}</option>)}
                  </select>
                </label>
              );
            })}
          </CardContent>
        </Card>
      ))}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : saved ? <Check className="size-4" aria-hidden="true" /> : null}
          {saved ? t("adminSaved") : t("adminSave")}
        </Button>
      </div>
    </div>
  );
}

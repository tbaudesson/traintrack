"use client";

import { createElement, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, LayoutGrid, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { saveSportChoice } from "@/hooks/useSportChoice";
import { FAVORITE_SPORTS, type FavoriteSport } from "@/lib/appTheme";
import { FAVORITE_DEFS } from "@/lib/disciplines";
import { CATEGORY_STYLE } from "@/components/domain/ProgramCatalog";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const iconOf = (sport: FavoriteSport) => CATEGORY_STYLE[sport === "callisthenics" ? "timed" : FAVORITE_DEFS[sport].category].icon;
/** A sport's icon (or "automatic" / "all sports"), drawn from the shelves' icons. */
const glyph = (sport: FavoriteSport | "auto" | "all", className: string) =>
  createElement(sport === "auto" ? Sparkles : sport === "all" ? LayoutGrid : iconOf(sport), { className, "aria-hidden": true });

/**
 * The sport the app follows, at the top of the home screen: its icon, and a
 * tap to change it (as in Settings › My sport, which keeps the second sport).
 * "Automatic" lets the sessions tell; "All sports" puts none forward.
 */
export function SportSwitch() {
  const t = useTranslations("sportSwitch");
  const ta = useTranslations("appearance");
  const tcat = useTranslations("catalog");
  const prefs = useAppPrefs();
  const [open, setOpen] = useState(false);
  const label = (s: FavoriteSport) => tcat(s === "callisthenics" ? "cat_timed" : `cat_${s}`);
  const current = prefs.sport ? label(prefs.sport) : prefs.allSports ? ta("sport_all") : ta("sport_none");
  const shown: FavoriteSport | "auto" | "all" = prefs.sport ?? (prefs.allSports ? "all" : "auto");

  const pick = async (change: Parameters<typeof saveSportChoice>[0]) => {
    await saveSportChoice(change);
    setOpen(false);
  };
  const row = (on: boolean) =>
    cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ring-1", on ? "bg-accent-500/10 ring-accent-500" : "ring-foreground/10 hover:bg-muted");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("button", { sport: current })}
        title={current}
        className="t-panel flex size-11 items-center justify-center rounded-lg text-accent-text"
      >
        {glyph(shown, "size-5")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FAVORITE_SPORTS.map((s) => {
              const on = prefs.sport === s;
              return (
                <button key={s} type="button" aria-pressed={on} onClick={() => pick({ sport: s, allSports: false, ...(prefs.sport2 === s ? { sport2: null } : {}) })} className={row(on)}>
                  {glyph(s, "size-5 shrink-0 text-accent-text")}
                  <span className="flex-1">{label(s)}</span>
                  {on && <Check className="size-4 text-accent-text" aria-hidden="true" />}
                </button>
              );
            })}
            <button type="button" aria-pressed={!prefs.sport && !prefs.allSports} onClick={() => pick({ sport: null, sport2: null, allSports: false })} className={row(!prefs.sport && !prefs.allSports)}>
              <Sparkles className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1">{ta("sport_none")}</span>
            </button>
            <button type="button" aria-pressed={prefs.allSports} onClick={() => pick({ sport: null, sport2: null, allSports: true })} className={row(prefs.allSports)}>
              <LayoutGrid className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1">{ta("sport_all")}</span>
            </button>
          </div>
          <Link href="/settings?section=sport" onClick={() => setOpen(false)} className="text-sm font-medium text-accent-text underline">
            {t("more")}
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
}

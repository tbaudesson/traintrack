"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ListChecks, RotateCcw } from "lucide-react";
import { useOutingChecklist } from "@/hooks/useOutingChecklist";
import { itemsFor, type Lang } from "@/lib/outingChecklist";
import { cn } from "@/lib/utils";

interface Ticked {
  autonomy: boolean;
  done: string[];
}

/**
 * The list to tick before setting off, kept on this device for this outing
 * (or for the next one, on its own page). "Autonomy" adds what a night out
 * on one's own asks for.
 */
export function OutingChecklist({ storageKey, compact = false }: { storageKey: string; compact?: boolean }) {
  const t = useTranslations("outingChecklist");
  const locale = useLocale();
  const lang: Lang = locale === "fr" || locale === "de" ? locale : "en";
  const list = useOutingChecklist();
  const cache = `traintrack.checklist.${storageKey}`;
  const [state, setState] = useState<Ticked>({ autonomy: false, done: [] });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(cache) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device's storage, only on the client
      if (saved && Array.isArray(saved.done)) setState({ autonomy: !!saved.autonomy, done: saved.done });
    } catch {
      // Nothing kept: start from an empty list.
    }
  }, [cache]);

  const save = (next: Ticked) => {
    setState(next);
    try {
      localStorage.setItem(cache, JSON.stringify(next));
    } catch {
      // Private window: kept for this visit only.
    }
  };

  if (!list) return compact ? null : <p role="status" className="text-sm text-muted-foreground">{t("notLoaded")}</p>;
  const sections = itemsFor(list, state.autonomy);
  const all = sections.flatMap((s) => s.items.map((i) => i.key));
  const done = all.filter((k) => state.done.includes(k)).length;

  return (
    <section className="space-y-3" aria-labelledby={`checklist-${storageKey}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 id={`checklist-${storageKey}`} className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-accent-text" aria-hidden="true" />
          {t("title")}
        </h3>
        <span className={cn("text-xs font-semibold tabular-nums", done === all.length ? "text-success-text" : "text-muted-foreground")}>
          {t("progress", { done, total: all.length })}
        </span>
      </div>
      <label className="flex min-h-11 items-center gap-3 rounded-lg bg-muted/50 px-3 text-sm">
        <input type="checkbox" className="size-5 accent-accent-600" checked={state.autonomy} onChange={(e) => save({ ...state, autonomy: e.target.checked })} />
        <span>
          {t("autonomy")}
          <span className="block text-xs text-muted-foreground">{t("autonomyHint")}</span>
        </span>
      </label>
      {sections.map((s) => (
        <fieldset key={s.key} className="space-y-1">
          <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{s.title[lang]}</legend>
          {s.items.map((i) => {
            const on = state.done.includes(i.key);
            return (
              <label key={i.key} className="flex min-h-11 items-start gap-3 py-1 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-accent-600"
                  checked={on}
                  onChange={() => save({ ...state, done: on ? state.done.filter((k) => k !== i.key) : [...state.done, i.key] })}
                />
                <span className={cn(on && "text-muted-foreground line-through")}>{i.text[lang]}</span>
              </label>
            );
          })}
        </fieldset>
      ))}
      {done === all.length && all.length > 0 && (
        <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success-text">
          <Check className="h-4 w-4" aria-hidden="true" />
          {t("ready")}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("care")}</p>
        {done > 0 && (
          <button type="button" onClick={() => save({ ...state, done: [] })} className="inline-flex min-h-10 shrink-0 items-center gap-1 text-xs font-medium text-accent-text">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("reset")}
          </button>
        )}
      </div>
    </section>
  );
}

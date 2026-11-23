"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { DISPLAY_MODES, type DisplayMode } from "@/lib/displayMode";
import { cn } from "@/lib/utils";

/** The three display modes, each with what it shows; the one picked is ticked. */
export function DisplayModePicker({ value, onChange }: { value: DisplayMode; onChange: (mode: DisplayMode) => void }) {
  const t = useTranslations("displayMode");
  return (
    <div role="radiogroup" aria-label={t("title")} className="grid gap-2 sm:grid-cols-3">
      {DISPLAY_MODES.map((mode) => {
        const on = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(mode)}
            className={cn(
              "flex min-h-11 items-start gap-2 rounded-xl border p-3 text-left transition-colors",
              on ? "border-accent-500 bg-accent-500/10" : "border-border hover:bg-muted"
            )}
          >
            <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", on ? "border-accent-500 bg-accent-500 text-white" : "border-border")}>
              {on && <Check className="size-3" aria-hidden="true" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t(`mode_${mode}`)}</span>
              <span className="block text-xs text-muted-foreground">{t(`desc_${mode}`)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

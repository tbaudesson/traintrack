import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled row of choices, with an optional hint under it. */
export function ChoiceField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}

/** One choice of a row: a pill, filled when it is the one picked. */
export function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
        on ? "border-accent-500 bg-accent-500 text-white" : "border-border text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

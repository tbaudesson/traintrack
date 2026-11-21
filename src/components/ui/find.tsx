"use client";

import { forwardRef, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** The search field of a picker: a magnifier, and a cross to clear it. */
export const SearchField = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; placeholder: string; clearLabel: string }>(
  function SearchField({ value, onChange, placeholder, clearLabel }, ref) {
    return (
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={ref}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          aria-label={placeholder}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} aria-label={clearLabel} className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
);

/** A row of filter chips that scrolls sideways on a phone instead of wrapping into a wall. */
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {children}
    </div>
  );
}

/** One filter chip: on or off. */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
        on ? "border-accent-600 bg-accent-600 text-white" : "border-border text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

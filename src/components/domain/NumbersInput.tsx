"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * A list of values typed as "10, 15, 20": kept as typed while being edited,
 * handed back once left. Values that are not numbers are dropped, unless
 * `asText` keeps them as written ("30-30").
 */
export function NumbersInput<T extends number | string>({
  value,
  onChange,
  label,
  asText,
}: {
  value: T[];
  onChange: (next: T[]) => void;
  label: string;
  asText?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  return (
    <Input
      aria-label={label}
      placeholder={label}
      value={text ?? value.join(", ")}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text === null) return;
        const parts = text.split(/[,;\s]+/).filter(Boolean);
        onChange((asText ? parts : parts.map(Number).filter((n) => Number.isFinite(n))) as T[]);
        setText(null);
      }}
      className="h-9"
    />
  );
}

/** One whole number, typed in a small field. */
export function NumberInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <label className="block space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <Input type="number" inputMode="numeric" aria-label={label} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))} className="h-9" />
    </label>
  );
}

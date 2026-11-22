"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createProgram } from "@/hooks/usePrograms";
import { SPORTS } from "@/lib/cardio";
import { quickProgramDays, type QuickKind } from "@/lib/quickProgram";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KINDS: QuickKind[] = ["strength", ...SPORTS.filter((s) => s !== "other")];

/**
 * A program in three answers: its name, what it trains, how many days a week.
 * Nothing is created before "Create"; the days are then filled in the editor.
 * A ready-made program is one tap away instead.
 */
export function QuickProgramDialog({
  open,
  onOpenChange,
  onReadyMade,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shows the ready-made programs instead. */
  onReadyMade: () => void;
}) {
  const t = useTranslations("programs");
  const tq = useTranslations("quickProgram");
  const tc = useTranslations("cardio");
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<QuickKind>("strength");
  const [days, setDays] = useState(3);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const id = await createProgram({ name: name.trim(), structure: quickProgramDays(kind, days, t("day")) });
      onOpenChange(false);
      router.push(`/programs/${id}/edit`);
    } finally {
      setBusy(false);
    }
  }

  const chip = (pressed: boolean) =>
    cn(
      "min-h-11 rounded-full border px-3 text-sm font-medium",
      pressed ? "border-accent-500 bg-accent-500 text-white" : "border-border hover:bg-muted"
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tq("title")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label className="block text-sm font-medium">
            {tq("name")}
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tq("namePlaceholder")} maxLength={80} className="mt-1" autoFocus />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{tq("kind")}</legend>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>
                  {k === "strength" ? tc("dayStrength") : tc(`sport_${k}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{tq("daysPerWeek")}</legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} type="button" aria-pressed={days === n} aria-label={tq("days", { count: n })} onClick={() => setDays(n)} className={cn(chip(days === n), "w-11 px-0 tabular-nums")}>
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">{tq("hint")}</p>
          <Button type="submit" className="w-full" disabled={!name.trim() || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : tq("create")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              onReadyMade();
            }}
          >
            {tq("readyMade")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

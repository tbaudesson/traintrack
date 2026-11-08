"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { platesPerSide } from "@/lib/performance";

/** Which plates to put on each side of the bar for a given weight. */
export function PlateCalculator({
  open,
  onOpenChange,
  initialWeight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWeight?: number;
}) {
  const t = useTranslations("log");
  const [weight, setWeight] = useState(initialWeight ? String(initialWeight) : "");
  const [bar, setBar] = useState("20");
  const result = platesPerSide(Number(weight) || 0, Number(bar) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("plates")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            {t("plateTarget")}
            <Input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1" />
          </label>
          <label className="text-sm font-medium">
            {t("plateBar")}
            <Input type="number" inputMode="decimal" value={bar} onChange={(e) => setBar(e.target.value)} className="mt-1" />
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{t("platePerSide")}</p>
          {result.plates.length ? (
            <ul className="flex flex-wrap gap-2">
              {result.plates.map((kg, i) => (
                <li key={i} className="t-well flex h-11 min-w-11 items-center justify-center rounded-xl bg-accent-100 px-2 font-bold text-accent-text tabular-nums dark:bg-accent-900/40">
                  {kg}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("plateNone")}</p>
          )}
          {result.left > 0 && <p className="mt-2 text-sm text-muted-foreground">{t("plateLeft", { kg: result.left })}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

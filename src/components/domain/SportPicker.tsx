"use client";

import { useTranslations } from "next-intl";
import type { Sport } from "@/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetailRow } from "@/components/ui/detail-row";
import { SPORTS } from "@/lib/cardio";
import { Activity } from "lucide-react";

export function SportPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (sport: Sport) => void;
}) {
  const t = useTranslations("cardio");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pickSport")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SPORTS.map((sport) => (
            <DetailRow key={sport} onClick={() => onPick(sport)} icon={Activity} title={t(`sport_${sport}`)} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

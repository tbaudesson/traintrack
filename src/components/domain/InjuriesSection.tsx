"use client";

import { useTranslations } from "next-intl";
import { Ban, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useInjuryGuidance } from "@/hooks/useInjuryGuidance";
import { usePainReports } from "@/hooks/usePain";
import { useMyRestrictions } from "@/hooks/useInjuryRules";
import { InjuryCareCard } from "@/components/domain/InjuryCareCard";
import { DeclareInjuryButton } from "@/components/domain/InjuryAreas";
import { activeInjuries, returnPhases } from "@/lib/injuries";
import { persistentPains } from "@/lib/injuryGuidance";
import { localDate } from "@/lib/dates";

/**
 * Injuries and restrictions in one place (the home screen shows one line and
 * leads here): the care of an injury in progress, declaring one, and one's
 * restrictions.
 */
export function InjuriesSection() {
  const t = useTranslations("injuryCare");
  const profile = useAthleteProfileOrNull();
  const guidance = useInjuryGuidance();
  const pains = usePainReports();
  const restrictions = useMyRestrictions();
  const today = localDate();
  const injuries = profile?.injuryAreas ?? [];
  const something =
    !!guidance && (activeInjuries(injuries).length > 0 || persistentPains(guidance, pains, today).length > 0 || returnPhases(guidance, injuries, today, pains).length > 0);
  return (
    <section id="injuries" className="t-workspace-wide scroll-mt-20 space-y-3" aria-labelledby="injuries-title">
      <h2 id="injuries-title" className="t-section-heading">{t("sectionTitle")}</h2>
      {something && guidance ? <InjuryCareCard guidance={guidance} injuries={injuries} pains={pains} today={today} declare={false} /> : <p className="text-sm text-muted-foreground">{t("none")}</p>}
      <DeclareInjuryButton />
      <Link href="/settings?section=restrictions" className="t-panel flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium">
        <Ban className="size-4 text-accent-text" aria-hidden="true" />
        <span className="flex-1">{t("restrictionsLink", { count: restrictions.length })}</span>
        <ChevronRight className="size-4 text-accent-text" aria-hidden="true" />
      </Link>
    </section>
  );
}

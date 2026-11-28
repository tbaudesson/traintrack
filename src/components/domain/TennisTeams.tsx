"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardPen, Plus } from "lucide-react";
import type { TennisGroup } from "@/db";
import { Link } from "@/i18n/navigation";
import { useTennisGroups } from "@/hooks/useTennis";
import { useTennisReference } from "@/hooks/useTennisReference";
import { refLabel } from "@/lib/tennisReference";
import { sortedSlots } from "@/lib/tennis";
import { tennisGroupHref } from "@/lib/routes";
import { SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { GroupDialog } from "@/components/domain/TennisDialogs";

/**
 * In Coaching > Teams, the tennis groups: teams without accounts, whose
 * lessons a coach prepares and gives (the tennis notebook). Nothing about
 * their players but how many they are.
 */
export function TennisTeams() {
  const t = useTranslations("tennis");
  const locale = useLocale();
  const groups = useTennisGroups();
  const reference = useTennisReference();
  const [editing, setEditing] = useState<Partial<TennisGroup> | null>(null);
  const active = (groups ?? []).filter((g) => !g.archivedAt);
  return (
    <section className="space-y-2" aria-labelledby="tennis-teams">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionHeading id="tennis-teams">{t("teamsTitle")}</SectionHeading>
        <div className="flex gap-1.5">
          <Link href="/tennis" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <ClipboardPen className="mr-1 size-4" aria-hidden="true" />
            {t("notebook")}
          </Link>
          {reference && (
            <Button size="sm" onClick={() => setEditing({})}>
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {t("newGroup")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("teamsHint")}</p>
      {active.map((g) => (
        <DetailRow
          key={g.id}
          href={tennisGroupHref(g.id!)}
          icon={ClipboardPen}
          title={g.name}
          subtitle={[
            reference && g.ageBand ? refLabel(reference.ageBands, g.ageBand, locale) : null,
            g.players ? t("playersCount", { count: g.players }) : null,
            ...sortedSlots(g.slots ?? []).map((s) => `${t(`day_${s.day}`)} ${s.time}`),
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
      {reference && <GroupDialog group={editing} reference={reference} onClose={() => setEditing(null)} />}
    </section>
  );
}

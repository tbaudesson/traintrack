"use client";

import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useDisplayMode } from "@/hooks/useDisplayMode";

/**
 * Said where parts are kept for another mode: which mode one is in, and the
 * way to see more. Nothing when everything shows.
 */
export function DisplayModeHint() {
  const t = useTranslations("displayMode");
  const { mode } = useDisplayMode();
  if (mode === "expert") return null;
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <Eye className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{t("hint", { mode: t(`mode_${mode}`) })}</span>
      <Link href="/settings?section=display" className="flex min-h-10 shrink-0 items-center font-semibold text-accent-text">
        {t("change")}
      </Link>
    </p>
  );
}

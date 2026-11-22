"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { giveAiConsent } from "@/lib/aiService";
import { Button } from "@/components/ui/button";

/**
 * The agreement asked once before the first request to the AI: what leaves
 * the device, where it goes, and how to take it back. Nothing is sent before
 * "I agree"; declining simply leaves the AI off.
 */
export function AiConsent({ sends, onAccept }: { sends: "coach" | "program"; onAccept: () => void }) {
  const t = useTranslations("aiConsent");
  const items = sends === "coach" ? (["coach1", "coach2", "coach3", "coach4"] as const) : (["program1", "program2"] as const);
  return (
    <section className="space-y-3 rounded-xl bg-muted/60 p-3 text-sm" aria-labelledby="ai-consent">
      <h3 id="ai-consent" className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden="true" />
        {t("title")}
      </h3>
      <p className="text-muted-foreground">{t("intro")}</p>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {t("never")}{" "}
        <Link href="/legal/privacy" className="underline">{t("privacy")}</Link>
      </p>
      <Button
        className="w-full"
        onClick={() => {
          giveAiConsent();
          onAccept();
        }}
      >
        {t("accept")}
      </Button>
    </section>
  );
}

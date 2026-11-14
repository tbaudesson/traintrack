"use client";

import { useTranslations } from "next-intl";
import { Check, ChevronRight, Rocket } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface FirstStep {
  key: string;
  done: boolean;
  label: string;
  href?: string;
  onClick?: () => void;
}

/**
 * The first steps of a new athlete, on the home screen: a short list ticked
 * as they are done, to be hidden at any time. It leaves once all are done.
 */
export function FirstSteps({ steps, onDismiss }: { steps: FirstStep[]; onDismiss: () => void }) {
  const t = useTranslations("firstSteps");
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5" aria-labelledby="first-steps-title">
      <div className="flex items-start gap-3">
        <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="first-steps-title" className="font-semibold">
            {t("title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("progress", { done, total: steps.length })}</p>
        </div>
        <button type="button" onClick={onDismiss} className="min-h-10 shrink-0 px-1 text-sm font-medium text-muted-foreground underline">
          {t("hide")}
        </button>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-label={t("title")}
      >
        <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="space-y-1">
        {steps.map((s) => {
          const body = (
            <>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  s.done ? "border-accent-500 bg-accent-500 text-white" : "border-muted-foreground/50"
                )}
              >
                {s.done && <Check className="size-3.5" aria-hidden="true" />}
              </span>
              <span className={cn("min-w-0 flex-1 text-sm", s.done && "text-muted-foreground line-through")}>
                {s.label}
                {s.done && <span className="sr-only"> ({t("done")})</span>}
              </span>
              {!s.done && (s.href || s.onClick) && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            </>
          );
          const row = "flex min-h-11 w-full items-center gap-3 rounded-lg px-1 text-left";
          return (
            <li key={s.key}>
              {s.done || (!s.href && !s.onClick) ? (
                <div className={row}>{body}</div>
              ) : s.href ? (
                <Link href={s.href} onClick={s.onClick} className={cn(row, "hover:bg-muted")}>
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={s.onClick} className={cn(row, "hover:bg-muted")}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

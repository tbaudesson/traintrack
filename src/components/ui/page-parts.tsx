"use client";

/**
 * Two shapes every list page was re-implementing: a section heading and an
 * "empty list" message. Each page had its own, so they drifted in size and
 * weight and two pages side by side looked like two products.
 */

import type { ComponentType, ReactNode } from "react";

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold tracking-tight text-foreground">{children}</h2>;
}

export function EmptyState({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-10 text-center shadow-sm ring-1 ring-foreground/5">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
        <Icon className="size-7 text-accent-text" aria-hidden={true} />
      </span>
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  );
}

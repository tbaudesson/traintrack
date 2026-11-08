"use client";

/**
 * One row of a list, and the small counter tile. Rows used to be hand-built
 * from a Card on every page, with bare icons on some and tinted squares on
 * others. Here the shape lives in one place, so a page scans as a list.
 */

import type { ComponentType, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const TONES = {
  brand: "from-accent-50 to-accent-200 text-accent-text dark:from-accent-800/50 dark:to-accent-900/40",
  success: "from-green-50 to-green-200 text-green-800 dark:from-green-800/50 dark:to-green-900/40 dark:text-green-300",
  neutral: "from-card to-muted text-muted-foreground",
} as const;

export function IconWell({ icon: Icon, tone = "brand" }: { icon: Icon; tone?: keyof typeof TONES }) {
  return (
    <span className={cn("t-well flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-b", TONES[tone])}>
      <Icon className="size-5" aria-hidden={true} />
    </span>
  );
}

export function DetailRow({
  href,
  onClick,
  disabled,
  icon,
  tone,
  title,
  subtitle,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  icon: Icon;
  tone?: keyof typeof TONES;
  title: string;
  subtitle?: ReactNode;
}) {
  const interactive = !!(href || onClick);
  const body = (
    <>
      <IconWell icon={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {interactive && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden={true} />}
    </>
  );
  const className = cn(
    "flex min-h-16 w-full items-center gap-3 t-surface rounded-2xl px-4 py-3 text-left text-sm ring-1 ring-foreground/5",
    interactive && "transition-transform active:scale-[0.99]"
  );

  if (href) return <Link href={href} className={className}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} disabled={disabled} className={className}>{body}</button>;
  return <div className={className}>{body}</div>;
}

export function StatTile({
  icon: Icon,
  iconClassName = "text-accent-text",
  label,
  value,
}: {
  icon: Icon;
  iconClassName?: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-1 t-surface rounded-2xl p-4 text-center ring-1 ring-foreground/5">
      <Icon className={cn("size-5", iconClassName)} aria-hidden={true} />
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

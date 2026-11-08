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
  brand: "bg-accent-100 text-accent-text dark:bg-accent-900/30",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function IconWell({ icon: Icon, tone = "brand" }: { icon: Icon; tone?: keyof typeof TONES }) {
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
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
    "flex min-h-16 w-full items-center gap-3 rounded-xl bg-card px-4 py-3 text-left text-sm shadow-sm ring-1 ring-foreground/10",
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
    <div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl bg-card p-4 text-center shadow-sm ring-1 ring-foreground/10">
      <Icon className={cn("size-5", iconClassName)} aria-hidden={true} />
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

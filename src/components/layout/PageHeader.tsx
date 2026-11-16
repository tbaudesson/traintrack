"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncStatus } from "./SyncStatus";

/**
 * How many pages with a header were opened in the app since it started, so
 * that "back" never leaves the app: the history of a tab or of the home
 * screen app may hold a page before ours (a blank tab, another site).
 */
let depth = 0;
let goingBack = false;

interface PageHeaderProps {
  title: string;
  /** A way back on every page but the first ones (sign-up); on by default. */
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({ title, showBack = true, actions }: PageHeaderProps) {
  const router = useRouter();
  const tc = useTranslations("common");
  useEffect(() => {
    depth = goingBack ? Math.max(1, depth - 1) : depth + 1;
    goingBack = false;
  }, []);

  return (
    <header className="t-page-header sticky top-0 z-40 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            // Opened straight on this page (from the home screen icon or a link):
            // nothing to go back to in the app, so back leads home.
            onClick={() => {
              if (depth > 1) {
                goingBack = true;
                router.back();
              } else router.push("/");
            }}
            aria-label={tc("back")}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
        <span className="t-page-emblem hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex" aria-hidden="true">
          <Image src="/icons/logo.png" alt="" width={25} height={25} unoptimized />
        </span>
        <h1 className="t-display max-w-full min-w-0 flex-auto truncate text-xl md:text-2xl">{title}</h1>
        <SyncStatus />
        {actions && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
    </header>
  );
}

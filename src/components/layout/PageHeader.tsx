"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncStatus } from "./SyncStatus";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({ title, showBack = false, actions }: PageHeaderProps) {
  const router = useRouter();
  const tc = useTranslations("common");

  return (
    <header className="t-page-header sticky top-0 z-40 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => router.back()}
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

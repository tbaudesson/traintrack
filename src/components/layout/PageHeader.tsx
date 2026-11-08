"use client";

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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg flex-wrap items-center gap-x-3 gap-y-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
        <h1 className="max-w-full min-w-0 flex-auto truncate text-lg font-semibold">{title}</h1>
        <SyncStatus />
        {actions && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
    </header>
  );
}

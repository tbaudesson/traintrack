import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ThemeInit } from "@/components/layout/ThemeInit";
import { ServiceWorkerRegistration } from "@/components/layout/ServiceWorkerRegistration";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch {
    messages = (await import("@/messages/fr.json")).default;
  }

  return (
    <html lang={locale} className="h-full" suppressHydrationWarning>
      <body className="h-full bg-slate-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeInit />
          <ServiceWorkerRegistration />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
          >
            Skip to content
          </a>
          <AuthProvider>
            <div className="relative z-10 flex min-h-full flex-col">
              <AppShell>{children}</AppShell>
            </div>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

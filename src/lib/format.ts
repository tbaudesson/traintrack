import { useCallback } from "react";
import { useLocale } from "next-intl";

/** A number in the app's language: "56 623", "67,5" in French. */
export function formatNumber(n: number, locale: string, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(n);
}

/** A YYYY-MM-DD date in the app's language: "13/11/2026" in French. */
export function formatDay(date: string, locale: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** A YYYY-MM-DD date without the year: "13/11" in French, "11/13" in English. */
export function formatShortDay(date: string, locale: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Both, for the current language, in components. */
export function useFormat() {
  const locale = useLocale();
  return {
    num: useCallback((n: number, digits = 1) => formatNumber(n, locale, digits), [locale]),
    day: useCallback((date: string) => formatDay(date, locale), [locale]),
    short: useCallback((date: string) => formatShortDay(date, locale), [locale]),
  };
}

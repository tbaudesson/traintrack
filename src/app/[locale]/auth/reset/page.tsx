"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Loader2, Dumbbell } from "lucide-react";

const FIELD =
  "w-full rounded-lg border border-input bg-card h-11 pl-10 pr-3 text-base outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-200";

/**
 * Both halves of a password reset: asking for the link, and, when arriving
 * from that link (?recovery=1, already signed in by it), choosing a new one.
 */
export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const { resetPassword } = useAuth();
  const router = useRouter();

  const [recovery] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("recovery")
  );
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (recovery && value.length < 6) {
      setError(t("errorWeakPassword"));
      return;
    }
    setLoading(true);
    if (recovery) {
      const { error: updateError } = await supabase.auth.updateUser({ password: value });
      if (updateError) setError(updateError.message || t("errorGeneric"));
      else router.replace("/");
    } else {
      const result = await resetPassword(value);
      if (result.error) setError(t("errorRateLimit"));
      else setSent(true);
    }
    setLoading(false);
  };

  const Icon = recovery ? Lock : Mail;
  const label = recovery ? t("newPassword") : t("email");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-900/30">
            <Dumbbell className="h-9 w-9 text-accent-text" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            {recovery ? t("newPasswordTitle") : t("resetTitle")}
          </h1>
          {!recovery && (
            <p className="mt-1 text-center text-sm text-muted-foreground">{t("resetDesc")}</p>
          )}
        </div>

        {sent ? (
          <p className="rounded-lg bg-accent-50 p-4 text-center text-sm text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">
            {t("resetSent")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-value" className="mb-1 block text-sm font-medium">
                {label}
              </label>
              <div className="relative">
                <Icon
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="reset-value"
                  type={recovery ? "password" : "email"}
                  autoComplete={recovery ? "new-password" : "email"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  className={FIELD}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-red-50 p-2 text-center text-sm text-red-600 dark:bg-red-950/40">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : recovery ? (
                t("newPasswordSave")
              ) : (
                t("resetSend")
              )}
            </Button>
          </form>
        )}

        {!recovery && (
          <p className="mt-4 text-center text-sm">
            <Link href="/auth/login" className="text-accent-text hover:underline">
              {t("backToLogin")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

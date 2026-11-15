"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

function mapError(code: string, t: (k: string) => string): string {
  switch (code) {
    case "AUTH_RATE_LIMIT":
      return t("errorRateLimit");
    case "AUTH_EMAIL_TAKEN":
      return t("errorEmailTaken");
    case "AUTH_WEAK_PASSWORD":
      return t("errorWeakPassword");
    default:
      return code || t("errorGeneric");
  }
}

export default function SignupPage() {
  const t = useTranslations("auth");
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signUp(email, password);
    if (result.error) setError(mapError(result.error, t));
    else setDone(true);
    setLoading(false);
  };

  return (
    <div className="t-auth-shell flex min-h-screen flex-col items-center justify-center px-4">
      <div className="t-auth-panel w-full max-w-sm rounded-3xl p-6 md:p-8">
        <div className="mb-8 flex flex-col items-center">
          <BrandMark />
          <h1 className="mt-4 text-2xl font-bold">TrainTrack</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("signupTitle")}</p>
        </div>

        {done ? (
          <p className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
            {t("signupSuccess")}
          </p>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="mb-1 block text-sm font-medium">{t("email")}</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                  className="w-full rounded-lg border border-input bg-card h-11 pl-10 pr-3 text-base outline-none focus:border-accent-500 focus-visible:ring-2 focus-visible:ring-accent-500/50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-1 block text-sm font-medium">{t("password")}</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  required
                  className="w-full rounded-lg border border-input bg-card h-11 pl-10 pr-3 text-base outline-none focus:border-accent-500 focus-visible:ring-2 focus-visible:ring-accent-500/50"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-red-50 p-2 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signUp")}
            </Button>

            <p className="text-center text-sm">
              {t("haveAccount")}{" "}
              <Link href="/auth/login" className="text-accent-text hover:underline">
                {t("signIn")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

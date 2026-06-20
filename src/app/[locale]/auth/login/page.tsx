"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Loader2, Dumbbell } from "lucide-react";

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

export default function LoginPage() {
  const t = useTranslations("auth");
  const { signIn, signInWithMagicLink } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) setError(mapError(result.error, t));
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) return;
    setError("");
    setLoading(true);
    const result = await signInWithMagicLink(email);
    if (result.error) setError(mapError(result.error, t));
    else setMagicLinkSent(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-900/30">
            <Dumbbell className="h-9 w-9 text-accent-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            TrainTrack
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("loginTitle")}
          </p>
        </div>

        {magicLinkSent ? (
          <p className="rounded-lg bg-accent-50 p-4 text-center text-sm text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">
            {t("magicLinkSent")}
          </p>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("email")}</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-accent-500 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t("password")}</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-accent-500 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-red-50 p-2 text-center text-sm text-red-600 dark:bg-red-950/40">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signIn")}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              {t("magicLink")}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Link href="/auth/reset" className="text-accent-600 hover:underline">
                {t("forgotPassword")}
              </Link>
              <Link href="/auth/signup" className="text-accent-600 hover:underline">
                {t("signUp")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

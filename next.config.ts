import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

/** REST and auth over https, realtime over wss. */
const supabase = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return { https: "", wss: "" };
  const url = new URL(raw);
  return { https: url.origin, wss: `wss://${url.host}` };
})();

/**
 * Content-Security-Policy. Every external origin below is one the app really
 * talks to: Supabase, the Anthropic API (AI programs, user's own key),
 * Open Food Facts (barcode lookup), and the YouTube/Vimeo exercise players.
 * script-src keeps 'unsafe-inline' for Next's inline bootstrap on statically
 * rendered pages; what the policy still buys is no script from elsewhere and
 * no fetch to anywhere else, so injected code cannot ship the data or the
 * Anthropic key out.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com",
  "font-src 'self' data:",
  `media-src 'self' blob: ${supabase.https}`,
  `connect-src 'self' ${supabase.https} ${supabase.wss} https://api.anthropic.com https://world.openfoodfacts.org${isDev ? " ws:" : ""}`,
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/** Barcode scanner, voice notes and heart-rate strap; everything else off. */
const permissionsPolicy = [
  "camera=(self)",
  "microphone=(self)",
  "bluetooth=(self)",
  "geolocation=()",
  "payment=()",
  "usb=()",
].join(", ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Permissions-Policy", value: permissionsPolicy },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

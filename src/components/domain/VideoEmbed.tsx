"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play, ExternalLink } from "lucide-react";

/** Extract a playable video id from a YouTube or Vimeo URL. */
function parseVideo(url: string): { kind: "youtube" | "vimeo"; id: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? { kind: "youtube", id } : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? { kind: "youtube", id } : null;
      }
      const m = u.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/);
      if (m) return { kind: "youtube", id: m[1] };
      return null; // search results or channel — nothing embeddable
    }
    if (host.endsWith("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return { kind: "vimeo", id: m[1] };
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/**
 * Plays an exercise video inline. A specific YouTube/Vimeo link embeds a lazy
 * player (thumbnail → iframe on tap); anything else (e.g. a search link) falls
 * back to opening externally.
 */
export function VideoEmbed({ url }: { url: string }) {
  const t = useTranslations("exercises");
  const [playing, setPlaying] = useState(false);
  const v = parseVideo(url);

  if (!v) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600"
      >
        <ExternalLink className="h-4 w-4" /> {t("watch")}
      </a>
    );
  }

  const src =
    v.kind === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1`
      : `https://player.vimeo.com/video/${v.id}?autoplay=1`;
  const thumb = v.kind === "youtube" ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : null;

  if (playing) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={src}
          title={t("watch")}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="group relative block w-full overflow-hidden rounded-lg bg-black"
      style={{ aspectRatio: "16 / 9" }}
      aria-label={t("watch")}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
      ) : (
        <div className="h-full w-full" />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition group-hover:scale-110">
          <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
        </span>
      </span>
    </button>
  );
}

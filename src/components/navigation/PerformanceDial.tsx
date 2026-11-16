"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { currentItemId, type NavigationSectionDef } from "@/lib/navConfig";
import { navigationIcon } from "./navigationIcons";

const C = 100; // centre of the 200 × 200 drawing
const PIE = 64; // radius of the sections' pie
const HUB = 21; // radius of the centre
const RING = 77; // radius where the destinations sit

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
};
const wedge = (from: number, to: number) => {
  const a = polar(PIE, from), b = polar(PIE, to), c = polar(HUB + 2, to), d = polar(HUB + 2, from);
  const large = to - from > 180 ? 1 : 0;
  return `M${a.x} ${a.y} A${PIE} ${PIE} 0 ${large} 1 ${b.x} ${b.y} L${c.x} ${c.y} A${HUB + 2} ${HUB + 2} 0 ${large} 0 ${d.x} ${d.y}Z`;
};
const angleOf = (x: number, y: number, rect: DOMRect) =>
  (Math.atan2(y - (rect.top + rect.height / 2), x - (rect.left + rect.width / 2)) * 180) / Math.PI;

/**
 * Dynamic's navigation: a physical dial. The sections are the slices of the
 * centre, turned by a drag, the arrow keys or a tap (the one on top is active);
 * the active section's destinations sit on the outer ring, one tap away.
 */
export function PerformanceDial({
  sections, activeId, pathname, onSelect, onHome,
}: {
  sections: readonly NavigationSectionDef[];
  activeId: NavigationSectionDef["id"] | undefined;
  pathname: string;
  onSelect: (id: NavigationSectionDef["id"]) => void;
  onHome: () => void;
}) {
  const t = useTranslations("nav");
  const count = Math.max(sections.length, 1);
  const step = 360 / count;
  const activeIndex = Math.max(0, sections.findIndex((s) => s.id === activeId));
  const active = sections[activeIndex];
  // The slice of section i is centred on -90° + i·step + rotation; the active one on top.
  const [drag, setDrag] = useState<number | null>(null);
  const rotation = -activeIndex * step + (drag ?? 0);
  const gesture = useRef<{ start: number; pointerId: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const choose = (index: number) => onSelect(sections[((index % count) + count) % count].id);
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    gesture.current = { start: angleOf(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()), pointerId: event.pointerId, moved: false };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    let delta = angleOf(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()) - g.start;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (!g.moved && Math.abs(delta) < 6) return;
    if (!g.moved) {
      g.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDrag(delta);
  };
  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !g.moved) return;
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    // The slice that ends up on top becomes the active section.
    const turned = Math.round((drag ?? 0) / step);
    setDrag(null);
    choose(activeIndex - turned);
  };

  const current = active ? currentItemId(active, pathname) : undefined;
  const children = active?.children ?? [];
  const animate = drag === null ? "transition-[transform,left,top] duration-300 ease-out motion-reduce:transition-none" : "";

  return (
    <nav
      aria-label={t("allSections")}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); choose(activeIndex + 1); }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); choose(activeIndex - 1); }
      }}
      className="t-dial flex w-full flex-col items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className="relative aspect-square w-[min(92vw,23rem)] touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <linearGradient id="dial-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f2f4f8" />
              <stop offset="0.22" stopColor="#6c7280" />
              <stop offset="0.45" stopColor="#dfe3ea" />
              <stop offset="0.62" stopColor="#4b505c" />
              <stop offset="0.82" stopColor="#c9ced8" />
              <stop offset="1" stopColor="#555a66" />
            </linearGradient>
            <linearGradient id="dial-slice" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#323743" />
              <stop offset="1" stopColor="#121419" />
            </linearGradient>
            <linearGradient id="dial-active" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--accent-400)" />
              <stop offset="1" stopColor="var(--accent-800)" />
            </linearGradient>
            <radialGradient id="dial-ring" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0.6" stopColor="#0b0c10" />
              <stop offset="1" stopColor="#1d2029" />
            </radialGradient>
          </defs>
          {/* Bezel: brushed metal with a violet glow inside. */}
          <circle cx={C} cy={C} r={96} fill="none" stroke="url(#dial-metal)" strokeWidth={7} />
          <circle cx={C} cy={C} r={92} fill="url(#dial-ring)" stroke="var(--accent-500)" strokeOpacity={0.55} strokeWidth={0.8} />
          {children.map((item, i) => {
            const a = -90 + (i + 0.5) * (360 / Math.max(children.length, 1));
            const p = polar(92, a), q = polar(PIE + 3, a);
            return <line key={item.id} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--accent-500)" strokeOpacity={0.35} strokeWidth={0.6} />;
          })}
          <g className={animate} style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "100px 100px" }}>
            {sections.map((section, i) => {
              const centre = -90 + i * step;
              return (
                <path
                  key={section.id}
                  d={wedge(centre - step / 2 + 1, centre + step / 2 - 1)}
                  fill={i === activeIndex ? "url(#dial-active)" : "url(#dial-slice)"}
                  stroke={i === activeIndex ? "var(--accent-300)" : "#454b59"}
                  strokeWidth={0.6}
                  className={i === activeIndex ? "t-dial-active" : undefined}
                />
              );
            })}
          </g>
        </svg>

        {/* The sections, on their slices. */}
        {sections.map((section, i) => {
          const p = polar((PIE + HUB) / 2 + 3, -90 + i * step + rotation);
          const on = i === activeIndex;
          return (
            <button
              key={section.id}
              type="button"
              aria-pressed={on}
              onClick={() => choose(i)}
              className={cn("t-dial-slice absolute flex w-[23%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-lg text-center outline-none focus-visible:ring-2 focus-visible:ring-ring", animate, on ? "text-white" : "text-[#d7dbe3]")}
              style={{ left: `${p.x / 2}%`, top: `${p.y / 2}%` }}
            >
              <span aria-hidden="true">{navigationIcon(section.icon, "size-5")}</span>
              <span className="t-dial-label text-[0.68rem] leading-[1.05] uppercase">{t(section.key)}</span>
            </button>
          );
        })}

        {/* The active section's destinations, on the outer ring. */}
        {children.map((item, i) => {
          const p = polar(RING, -90 + (i + 0.5) * (360 / Math.max(children.length, 1)) - (360 / Math.max(children.length, 1)) / 2);
          return (
            <Link
              key={item.id}
              href={item.href}
              draggable={false}
              aria-current={item.id === current ? "page" : undefined}
              className="t-dial-destination absolute flex w-[22%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-lg text-center text-[0.66rem] font-semibold leading-tight text-[#e8ebf1] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left: `${p.x / 2}%`, top: `${p.y / 2}%` }}
            >
              <span aria-hidden="true">{navigationIcon(item.icon, "size-5")}</span>
              <span className="whitespace-nowrap">{t(item.key)}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onHome}
          aria-label={t("home")}
          className="t-dial-hub absolute left-1/2 top-1/2 flex size-[21%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image src="/icons/logo.png" alt="" width={34} height={34} unoptimized className="size-[42%]" />
          <span aria-hidden="true" className="t-dial-label text-[0.55rem] uppercase">TrainTrack</span>
        </button>
      </div>
      <p className="t-dial-hint text-center text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#c3c8d2]">{t("dialHint")}</p>
    </nav>
  );
}

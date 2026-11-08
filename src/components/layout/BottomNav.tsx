"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { NAV_CATALOG, getNavItemIds } from "@/lib/navConfig";
import { cn } from "@/lib/utils";
import {
  Home, Dumbbell, TrendingUp, Apple, Menu, ListChecks, ClipboardList, Users, HeartPulse, Trophy, Flag, MessageCircle, Activity, Newspaper,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Home, Dumbbell, TrendingUp, Apple, Menu, ListChecks, ClipboardList, Users, HeartPulse, Trophy, Flag, MessageCircle, Activity, Newspaper,
};

interface WheelEntry {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Degrees between two neighbours on the wheel. */
const STEP = 45;
/** Slots on each side of the top before an item reaches Home at the bottom. */
const SIDE_SLOTS = 3;
const WHEEL_RADIUS = 126;
/** Room above the ring, for the shadows of what sits on it. */
const TOP_MARGIN = 16;
/** Height of Home's centre above the bottom of the menu. */
const HOME_CENTRE = 50;
const CLOSED_HEIGHT = 86;
const SMALL = 54;
/** The card in the middle, as a share of the wheel's radius. */
const CARD_SHARE = 0.93;
const CARD_CORNER = 30;
/** How far from the top slot a section starts leaving the ring, in slots. */
const FOCUS_REACH = 0.75;
/** Time constant of the glide towards where the wheel should be, in ms. */
const GLIDE_MS = 110;
/** Hover leaves the wheel open this long, so a wobbly pointer doesn't close it. */
const CLOSE_DELAY_MS = 260;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/** Where item i sits relative to the top slot, wrapped so the ring has no ends. */
function slotOffset(i: number, rotation: number, count: number) {
  return ((((i - rotation + count / 2) % count) + count) % count) - count / 2;
}

/** Small phones keep the labels on screen. */
function radiusFor(width: number) {
  return Math.min(WHEEL_RADIUS, width / 2 - 50);
}

function prefersStillness() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("reduce-motion")
  );
}

/**
 * The main navigation: a medallion that opens into a wheel.
 *
 * Closed, it is only the medallion (Home) over a thin curve. Hovering or
 * tapping opens a full circle of sections on a dotted ring. Dragging round the
 * wheel, the mouse wheel or the arrow keys turn it, and the section reaching
 * the top slot grows into a large card in the middle. The favourites chosen in
 * Settings sit highest; every other section waits further round.
 *
 * Positions are computed every frame rather than left to CSS transitions: a
 * transition would send an item wrapping round the ring back across the top,
 * and could not grow the focus in step with the finger.
 */
export function BottomNav() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { hasFeature } = useFeatureAccess();
  const [ids, setIds] = useState<string[]>(() => getNavItemIds());

  useEffect(() => {
    const sync = () => setIds(getNavItemIds());
    window.addEventListener("navitemschange", sync);
    return () => window.removeEventListener("navitemschange", sync);
  }, []);

  const items = useMemo((): WheelEntry[] => {
    const available = NAV_CATALOG.filter((n) => n.id !== "home" && (!n.feature || hasFeature(n.feature)));
    const rank = (id: string) => {
      const at = ids.indexOf(id);
      return at === -1 ? ids.length + 1 : at;
    };
    const ranked = [...available].sort((a, b) => rank(a.id) - rank(b.id));
    // Round the ring from the top, one side then the other.
    const n = ranked.length;
    const arranged = [...ranked];
    ranked.forEach((item, position) => {
      const slot = position % 2 ? (position + 1) / 2 : -position / 2;
      arranged[(slot + n) % n] = item;
    });
    return arranged.map((d) => ({ id: d.id, href: d.href, label: t(d.key), icon: ICONS[d.icon] ?? Home }));
  }, [ids, hasFeature, t]);

  const count = items.length;
  const activeIndex = items.findIndex((item) => pathname.startsWith(item.href));

  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [radius, setRadius] = useState(WHEEL_RADIUS);
  const [shown, setShown] = useState({ rotation: 0, openness: 0 });
  const shownRef = useRef(shown);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{
    startX: number;
    startY: number;
    angle: number;
    turned: number;
    rotation: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const navRef = useRef<HTMLElement>(null);
  const openRef = useRef(false);

  // A new page closes the wheel.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const openWheel = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!openRef.current) {
      // Each opening starts with the current section in focus, already in place.
      const start = Math.max(activeIndex, 0);
      setRotation(start);
      shownRef.current = { ...shownRef.current, rotation: start };
      setRadius(radiusFor(window.innerWidth));
    }
    openRef.current = true;
    setOpen(true);
  }, [activeIndex]);

  const closeWheel = useCallback((delay = 0) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      openRef.current = false;
      setOpen(false);
    }, delay);
  }, []);

  // Glide towards where the wheel should be. The finger is followed exactly.
  useEffect(() => {
    const goal = open ? 1 : 0;
    const still = prefersStillness();
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const current = shownRef.current;
      const k = still ? 1 : 1 - Math.exp(-Math.max(0, now - last) / GLIDE_MS);
      last = now;
      const next = {
        rotation: dragging ? rotation : current.rotation + (rotation - current.rotation) * k,
        openness: current.openness + (goal - current.openness) * k,
      };
      const settled = Math.abs(next.rotation - rotation) < 0.002 && Math.abs(next.openness - goal) < 0.002;
      shownRef.current = settled ? { rotation, openness: goal } : next;
      setShown(shownRef.current);
      if (!settled) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rotation, open, dragging]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWheel();
      if (e.key === "ArrowLeft") setRotation((r) => Math.round(r) - 1);
      if (e.key === "ArrowRight") setRotation((r) => Math.round(r) + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeWheel]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  /** The pointer's bearing from the wheel's centre, clockwise from the top. */
  const bearing = (x: number, y: number) => {
    const rect = navRef.current!.getBoundingClientRect();
    const dx = x - (rect.left + rect.width / 2);
    const dy = rect.bottom - HOME_CENTRE - radius - y;
    return { angle: (Math.atan2(dx, dy) * 180) / Math.PI, fromCentre: Math.hypot(dx, dy) };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!open) return;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      angle: bearing(e.clientX, e.clientY).angle,
      turned: 0,
      rotation,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // The pointer is already gone; the drag simply ends on its own.
      }
    }
    const { angle, fromCentre } = bearing(e.clientX, e.clientY);
    const delta = ((angle - d.angle + 540) % 360) - 180;
    d.angle = angle;
    // Right through the centre the bearing swings wildly and means nothing.
    if (fromCentre < 36) return;
    d.turned += delta;
    setRotation(d.rotation - d.turned / STEP);
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    suppressClick.current = true;
    setDragging(false);
    setRotation((r) => Math.round(r));
  };
  const wheelLock = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    if (!open) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const now = Date.now();
    if (Math.abs(delta) < 4 || now - wheelLock.current < 140) return;
    wheelLock.current = now;
    setRotation((r) => Math.round(r) + Math.sign(delta));
  };

  // A mouse opens on hover and closes on leaving; touch opens on tap.
  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") openWheel();
  };
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && !drag.current) closeWheel(CLOSE_DELAY_MS);
  };
  const onHomeClick = (e: React.MouseEvent) => {
    if (!open) {
      e.preventDefault();
      openWheel();
      return;
    }
    closeWheel();
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const { openness } = shown;
  // The ring grows out of Home as it opens.
  const centreHeight = HOME_CENTRE + radius * openness;
  // Items fade out on reaching Home, where they cross to the other side.
  const edge = Math.min(SIDE_SLOTS + 0.5, count / 2);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => closeWheel()}
        className={cn(
          "t-arc-scrim fixed inset-0 z-40 transition-opacity duration-500 motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div className="safe-area-pb pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center">
        <nav
          ref={navRef}
          aria-label={tc("mainNav")}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
          onClickCapture={onClickCapture}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeWheel();
          }}
          // A mouse drag on a link would start the browser's own link drag.
          onDragStart={(e) => e.preventDefault()}
          style={{ height: CLOSED_HEIGHT + (HOME_CENTRE + 2 * radius + TOP_MARGIN - CLOSED_HEIGHT) * openness }}
          // Closed, only the medallion catches taps; the page beside it stays usable.
          className={cn("relative w-full max-w-[420px] select-none", open ? "pointer-events-auto touch-none" : "pointer-events-none")}
        >
          <WheelBackdrop radius={radius} openness={openness} centreHeight={centreHeight} />

          <ul className="absolute left-1/2 h-0 w-0" style={{ bottom: centreHeight }} role="list" aria-hidden={!open}>
            {items.map((item, i) => {
              const offset = slotOffset(i, shown.rotation, count);
              const distance = Math.abs(offset);
              const opacity = clamp01((edge - distance) / 0.5) * clamp01(openness * 1.4 - 0.2);
              const near = clamp01((FOCUS_REACH - distance) / FOCUS_REACH);
              return (
                <WheelItem
                  key={item.id}
                  item={item}
                  angle={offset * STEP}
                  radius={radius * openness}
                  cardSize={radius * CARD_SHARE}
                  focus={near * near * (3 - 2 * near)}
                  opacity={opacity}
                  interactive={open && opacity > 0.6}
                  current={i === activeIndex}
                  stack={Math.round(20 - distance)}
                />
              );
            })}
          </ul>

          <Link
            href="/"
            draggable={false}
            onClick={onHomeClick}
            onPointerEnter={onPointerEnter}
            aria-expanded={open}
            aria-current={pathname === "/" ? "page" : undefined}
            aria-label={open ? t("home") : tc("openNav")}
            style={{ bottom: HOME_CENTRE }}
            className="group pointer-events-auto absolute left-1/2 z-30 -translate-x-1/2 translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
          >
            <span
              className={cn(
                "t-arc-hub relative inline-flex items-center justify-center rounded-full transition-[transform,width,height] duration-500 motion-reduce:transition-none group-active:scale-95",
                open ? "size-[60px]" : "size-14"
              )}
            >
              <Home className="size-7" aria-hidden="true" />
            </span>
          </Link>
        </nav>
      </div>
    </>
  );
}

function WheelBackdrop({
  radius,
  openness,
  centreHeight,
}: {
  radius: number;
  openness: number;
  centreHeight: number;
}) {
  const box = radius * 2 + 4;
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${box} ${box}`}
        width={box}
        height={box}
        className="pointer-events-none absolute left-1/2"
        style={{
          marginLeft: -box / 2,
          bottom: centreHeight - box / 2,
          opacity: openness,
          transform: `scale(${0.3 + 0.7 * openness})`,
        }}
      >
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          strokeWidth="2"
          style={{ stroke: "var(--arc-rim)", filter: "drop-shadow(0 0 5px var(--arc-rim))" }}
        />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 420 60"
        className="pointer-events-none absolute bottom-0 left-1/2 h-[60px] w-[420px] -translate-x-1/2"
      >
        <defs>
          <linearGradient id="arc-line" x1="0" x2="1">
            <stop offset="0" style={{ stopColor: "var(--arc-rim)", stopOpacity: 0 }} />
            <stop offset="0.3" style={{ stopColor: "var(--arc-rim)", stopOpacity: 1 }} />
            <stop offset="0.7" style={{ stopColor: "var(--arc-rim)", stopOpacity: 1 }} />
            <stop offset="1" style={{ stopColor: "var(--arc-rim)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path
          d="M 10 56 Q 210 -36 410 56"
          fill="none"
          stroke="url(#arc-line)"
          strokeWidth="1.8"
        />
      </svg>
    </>
  );
}

function WheelItem({
  item,
  angle,
  radius,
  cardSize,
  focus,
  opacity,
  interactive,
  current,
  stack,
}: {
  item: WheelEntry;
  angle: number;
  radius: number;
  cardSize: number;
  /** 0 on the ring, 1 in the middle of the wheel. */
  focus: number;
  opacity: number;
  interactive: boolean;
  current: boolean;
  stack: number;
}) {
  const size = SMALL + (cardSize - SMALL) * focus;
  const corner = (SMALL / 2) * (1 - focus) + CARD_CORNER * focus;
  const iconSize = 24 + (cardSize * 0.4 - 24) * focus;
  const Icon = item.icon;

  return (
    <li
      style={{
        // Turn to the slot, step out along the radius, turn back upright.
        transform: `rotate(${angle}deg) translateY(${-radius * (1 - focus)}px) rotate(${-angle}deg)`,
        opacity,
        zIndex: stack,
      }}
      className={cn("absolute left-0 top-0 h-0 w-0", !interactive && "pointer-events-none")}
    >
      <Link
        href={item.href}
        draggable={false}
        tabIndex={interactive ? 0 : -1}
        aria-current={current ? "page" : undefined}
        aria-label={item.label}
        className="group absolute left-0 top-0 h-0 w-0 outline-none"
      >
        <span
          style={{ width: size, height: size, borderRadius: corner, marginLeft: -size / 2, marginTop: -size / 2 }}
          className="t-arc-bubble absolute left-0 top-0 inline-flex items-center justify-center group-focus-visible:ring-2 group-focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="t-arc-focus absolute inset-0" style={{ borderRadius: corner, opacity: focus }} />
          <span
            className={cn("relative", focus >= 0.5 && "t-arc-card-label")}
            style={{ transform: `translateY(${-cardSize * 0.09 * focus}px)` }}
          >
            <Icon aria-hidden="true" style={{ width: iconSize, height: iconSize }} />
          </span>
          {current && focus < 0.5 && <span aria-hidden="true" className="t-arc-mark absolute right-0 top-0 size-2.5 rounded-full" />}
          <span
            aria-hidden="true"
            className="t-arc-card-label absolute inset-x-0 text-center font-semibold leading-5"
            style={{ bottom: cardSize * 0.11, fontSize: Math.max(14, cardSize * 0.15), opacity: clamp01(focus * 2 - 1) }}
          >
            {item.label}
          </span>
        </span>
        <span
          aria-hidden="true"
          style={{ top: size / 2 + 4, opacity: clamp01(1 - focus * 2) }}
          className={cn(
            "t-arc-label absolute left-0 -translate-x-1/2 whitespace-nowrap rounded-md bg-background px-1 text-xs leading-[15px]",
            current ? "font-semibold" : "font-normal"
          )}
        >
          {item.label}
        </span>
      </Link>
    </li>
  );
}

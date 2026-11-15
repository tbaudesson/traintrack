"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CircularNavigationItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  current?: boolean;
}

export function CircularNavigation({
  items, centre, centreLabel, onCentre, onSelect, renderLink, ariaLabel, className,
}: {
  items: readonly CircularNavigationItem[];
  centre: ReactNode;
  centreLabel: string;
  onCentre: () => void;
  onSelect?: (id: string) => void;
  renderLink: (item: CircularNavigationItem, children: ReactNode) => ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const [rotation, setRotation] = useState(() => {
    const current = items.findIndex((item) => item.current);
    return current < 0 ? 0 : -current * (360 / Math.max(items.length, 1));
  });
  const start = useRef<{ x: number; y: number; rotation: number; dragging: boolean; pointerId: number } | null>(null);
  const suppressClick = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = Math.max(items.length, 1);
  const dragThreshold = 8;

  const rotate = (direction: number) => setRotation((value) => value - direction * (360 / count));
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    start.current = { x: event.clientX, y: event.clientY, rotation, dragging: false, pointerId: event.pointerId };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = start.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!gesture.dragging && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < dragThreshold) return;
    if (!gesture.dragging) {
      gesture.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setRotation(gesture.rotation + (event.clientX - gesture.x) * 0.55);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = start.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.dragging) {
      const step = 360 / count;
      setRotation((value) => Math.round(value / step) * step);
      suppressClick.current = true;
      if (suppressTimer.current) clearTimeout(suppressTimer.current);
      suppressTimer.current = setTimeout(() => { suppressClick.current = false; }, 0);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }
    start.current = null;
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = start.current;
    if (gesture?.dragging) {
      const step = 360 / count;
      setRotation((value) => Math.round(value / step) * step);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    start.current = null;
  };

  return (
    <nav
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }}
      onWheel={(event) => rotate(Math.sign(event.deltaY || event.deltaX))}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") rotate(-1);
        if (event.key === "ArrowRight") rotate(1);
      }}
      className={cn("relative size-[min(78vw,19rem)] touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <div aria-hidden="true" className="absolute inset-8 rounded-full border border-[var(--nav-ring)] shadow-[0_0_32px_var(--nav-glow)]" />
      <ul role="list" className="absolute inset-0 motion-reduce:transition-none" style={{ transform: `rotate(${rotation}deg)`, transition: "transform 240ms cubic-bezier(.2,.8,.2,1)" }}>
        {items.map((item, index) => {
          const angle = index * (360 / count);
          const child = (
            <span className={cn("flex size-14 flex-col items-center justify-center rounded-2xl border bg-[var(--nav-surface)] text-[var(--nav-foreground)] shadow-lg outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none", item.current && "border-[var(--nav-accent)] text-[var(--nav-accent)]")}>
              <span aria-hidden="true">{item.icon}</span>
              <span className="sr-only">{item.label}</span>
            </span>
          );
          return (
            <li key={item.id} className="absolute left-1/2 top-1/2 size-0" style={{ transform: `rotate(${angle}deg) translateY(calc(-1 * min(30vw, 7rem))) rotate(${-angle - rotation}deg)` }}>
              <span className="absolute -left-7 -top-7" onClick={() => onSelect?.(item.id)}>{renderLink(item, child)}</span>
              <span aria-hidden="true" className="pointer-events-none absolute top-8 w-24 -translate-x-1/2 rounded-lg bg-background/90 px-1.5 py-0.5 text-center text-[11px] leading-tight text-foreground">{item.label}</span>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onCentre} aria-label={centreLabel} className="t-arc-hub absolute left-1/2 top-1/2 z-10 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {centre}
      </button>
    </nav>
  );
}

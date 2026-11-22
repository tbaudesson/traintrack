/** "50:00", "3:30:00": a time to beat, typed as a watch shows it. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** "50", "50:00", "3:30:00" or "3h30" into seconds; null for anything else. A lone number is minutes. */
export function parseClock(text: string): number | null {
  const t = text.trim().replace(/\s+/g, "");
  let m = t.match(/^(\d+)[h:](\d{1,2})(?::(\d{1,2}))?$/i);
  if (m && /h/i.test(t)) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
  m = t.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  m = t.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = t.match(/^(\d+)$/);
  if (m) return Number(m[1]) * 60;
  return null;
}

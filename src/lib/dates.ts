const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The calendar date where the athlete is, YYYY-MM-DD. Not the UTC one: in
 * Luxembourg a session at half past midnight belongs to the new day.
 */
export function localDate(at: Date | number = new Date()): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The local date some days away (negative: before), counted in calendar days. */
export function localDateIn(days: number, from: Date | number = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return localDate(d);
}

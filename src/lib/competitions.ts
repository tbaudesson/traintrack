import type { CompetitionResult } from "@/db";

type Scores = Pick<CompetitionResult, "compulsory" | "technical" | "freestyle">;

/**
 * The final score of a competition, as in vaulting: the mean of the tests
 * that were judged, out of 10, to three decimals. Null when none was.
 */
export function finalScore(r: Scores): number | null {
  const scores = [r.compulsory, r.technical, r.freestyle].filter((s): s is number => typeof s === "number");
  if (!scores.length) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000;
}

/** A score typed by hand: "7,25" or "7.25", between 0 and 10, else null. */
export function parseScore(text: string): number | null {
  const n = Number(text.replace(",", ".").trim());
  if (!text.trim() || !Number.isFinite(n) || n < 0 || n > 10) return null;
  return Math.round(n * 1000) / 1000;
}

/** The best of each test and of the final score, and the progress since the first competition. */
export function competitionSummary(results: (Scores & { date: string })[]) {
  const chronological = [...results].sort((a, b) => a.date.localeCompare(b.date));
  const best = (key: keyof Scores) => {
    const values = results.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    return values.length ? Math.max(...values) : null;
  };
  const finals = chronological.map(finalScore).filter((v): v is number => v !== null);
  return {
    count: results.length,
    best: { compulsory: best("compulsory"), technical: best("technical"), freestyle: best("freestyle"), final: finals.length ? Math.max(...finals) : null },
    progress: finals.length >= 2 ? Math.round((finals[finals.length - 1] - finals[0]) * 1000) / 1000 : null,
  };
}

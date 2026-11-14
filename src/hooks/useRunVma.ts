import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { DEFAULT_VMA, type RunPaces } from "@/lib/runPaces";

/** The VMA to work paces out of: the athlete's, or a guess from the level until they give one. */
export function useRunVma(): { vma: number; paces: RunPaces | null; guessed: boolean } {
  const profile = useAthleteProfileOrNull();
  const paces = profile?.runPaces ?? null;
  if (paces?.vma) return { vma: paces.vma, paces, guessed: false };
  return { vma: DEFAULT_VMA[profile?.fitnessLevel ?? "beginner"] ?? DEFAULT_VMA.beginner, paces: null, guessed: true };
}

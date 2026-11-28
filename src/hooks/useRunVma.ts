import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useLevels } from "@/hooks/useLevels";
import { levelItem } from "@/lib/levels";
import type { RunPaces } from "@/lib/runPaces";

/** The VMA to work paces out of: the athlete's, or a guess from the level until they give one (null while the levels are not read). */
export function useRunVma(): { vma: number | null; paces: RunPaces | null; guessed: boolean } {
  const profile = useAthleteProfileOrNull();
  const levels = useLevels();
  const paces = profile?.runPaces ?? null;
  if (paces?.vma) return { vma: paces.vma, paces, guessed: false };
  return { vma: levelItem(levels, profile?.fitnessLevel)?.vma ?? null, paces: null, guessed: true };
}

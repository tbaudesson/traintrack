import { useEffect, useState } from "react";
import { getAppSettings } from "@/lib/adminService";
import { NUTRITION_GUIDANCE_KEY, parseGuidance, type NutritionGuidance } from "@/lib/sportNutrition";

const CACHE = "traintrack.nutritionGuidance";

function cached(): NutritionGuidance | null {
  try {
    return parseGuidance(localStorage.getItem(CACHE));
  } catch {
    return null;
  }
}

/**
 * The nutrition references the admin keeps, read online and kept on the
 * device for offline use; null until they have been read once.
 */
export function useNutritionGuidance(): NutritionGuidance | null {
  const [guidance, setGuidance] = useState<NutritionGuidance | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device's storage, only on the client
    setGuidance(cached());
    getAppSettings()
      .then((settings) => {
        const text = settings[NUTRITION_GUIDANCE_KEY];
        const fresh = parseGuidance(text);
        if (!fresh) return;
        try {
          localStorage.setItem(CACHE, text);
        } catch {
          // Private window: kept for this visit only.
        }
        setGuidance(fresh);
      })
      .catch(() => {});
  }, []);
  return guidance;
}

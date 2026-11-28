import { useAppGuidance } from "@/hooks/useAppGuidance";
import {
  CHOICES_KEY,
  EQUIPMENT_KEY,
  MOVEMENTS_KEY,
  SWIM_STROKES_KEY,
  PAIN_AREAS_KEY,
  itemLabel,
  parsePainAreas,
  parseChoices,
  parseEquipment,
  parseMovements,
  parseSwimStrokes,
  type Choices,
  type EquipmentItem,
  type ListItem,
  type MovementItem,
  type PainAreaItem,
} from "@/lib/references";
import { useCallback } from "react";
import { useLocale } from "next-intl";

/** Lists the admin keeps (Admin > Lists); null until read once. */
export const useEquipmentList = (): EquipmentItem[] | null => useAppGuidance(EQUIPMENT_KEY, parseEquipment);
export const useMovements = (): MovementItem[] | null => useAppGuidance(MOVEMENTS_KEY, parseMovements);
export const useSwimStrokes = (): ListItem[] | null => useAppGuidance(SWIM_STROKES_KEY, parseSwimStrokes);
export const useChoices = (): Choices | null => useAppGuidance(CHOICES_KEY, parseChoices);
export const usePainAreas = (): PainAreaItem[] | null => useAppGuidance(PAIN_AREAS_KEY, parsePainAreas);

/** An area's name in the app's language (its id while the list is not read). */
export function usePainAreaName(): (id: string | null | undefined) => string {
  const areas = usePainAreas();
  const locale = useLocale();
  return useCallback((id) => itemLabel(areas, id, locale), [areas, locale]);
}

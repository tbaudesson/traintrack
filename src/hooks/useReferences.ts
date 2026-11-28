import { useAppGuidance } from "@/hooks/useAppGuidance";
import {
  CHOICES_KEY,
  EQUIPMENT_KEY,
  MOVEMENTS_KEY,
  SWIM_STROKES_KEY,
  parseChoices,
  parseEquipment,
  parseMovements,
  parseSwimStrokes,
  type Choices,
  type EquipmentItem,
  type ListItem,
  type MovementItem,
} from "@/lib/references";

/** Lists the admin keeps (Admin > Lists); null until read once. */
export const useEquipmentList = (): EquipmentItem[] | null => useAppGuidance(EQUIPMENT_KEY, parseEquipment);
export const useMovements = (): MovementItem[] | null => useAppGuidance(MOVEMENTS_KEY, parseMovements);
export const useSwimStrokes = (): ListItem[] | null => useAppGuidance(SWIM_STROKES_KEY, parseSwimStrokes);
export const useChoices = (): Choices | null => useAppGuidance(CHOICES_KEY, parseChoices);

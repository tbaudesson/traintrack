import { PROGRAM_EQUIPMENT_KEY, parseProgramEquipment, type ProgramEquipmentGuide } from "@/lib/programEquipment";
import { useAppGuidance } from "./useAppGuidance";

/** What the ready-made programs need and what stands in, as the admin keeps it; null until read once. */
export const useProgramEquipment = (): ProgramEquipmentGuide | null => useAppGuidance(PROGRAM_EQUIPMENT_KEY, parseProgramEquipment);

"use client";

import { useEquipmentList } from "@/hooks/useReferences";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";

/**
 * The lists some calculations read on the device without a page showing
 * them (a load's step, a bar, the warm-up sets, an unsorted exercise's
 * group): read once the app opens, so they are there when needed.
 */
export function ReferencesWarmup() {
  useEquipmentList();
  useMuscleGroups();
  return null;
}

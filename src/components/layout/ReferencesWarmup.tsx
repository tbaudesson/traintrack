"use client";

import { useEquipmentList } from "@/hooks/useReferences";
import { useEffect } from "react";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { refreshTemplates } from "@/lib/templateService";
import { getCurrentUserId } from "@/db";
import { myTrackingReset } from "@/lib/trackingReset";

/**
 * The lists some calculations read on the device without a page showing
 * them (a load's step, a bar, the warm-up sets, an unsorted exercise's
 * group), and the ready-made programs (offered offline too): read once the
 * app opens, so they are there when needed.
 */
export function ReferencesWarmup() {
  useEquipmentList();
  useMuscleGroups();
  useEffect(() => void refreshTemplates(), []);
  // A reset of the tracking past its days is deleted for good when the app asks (see lib/trackingReset).
  useEffect(() => {
    if (!navigator.onLine) return;
    void getCurrentUserId().then((id) => (id ? myTrackingReset(id) : null)).catch(() => {});
  }, []);
  return null;
}

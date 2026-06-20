"use client";

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { FeatureKey } from "@/lib/adminService";

/**
 * Plan-based feature gating. Admins always pass. A feature is available when
 * the user's plan lists it in `plan_features`.
 */
export function useFeatureAccess() {
  const { planFeatures, isAdmin } = useAuth();
  const hasFeature = useCallback(
    (feature: FeatureKey) => isAdmin || planFeatures.includes(feature),
    [planFeatures, isAdmin]
  );
  return { hasFeature };
}

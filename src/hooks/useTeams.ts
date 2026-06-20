"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMyGroups,
  getMyMemberships,
  type Group,
  type GroupMembership,
} from "@/lib/groupService";

/**
 * Loads the teams the current user coaches (owns) and the teams they belong to.
 * Team data is RPC-backed (online), not part of the offline Dexie sync.
 */
export function useTeams() {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, m] = await Promise.all([getMyGroups(), getMyMemberships()]);
      setMyGroups(g);
      setMemberships(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { myGroups, memberships, loading, error, refresh };
}

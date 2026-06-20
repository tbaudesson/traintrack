"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyGroups, getGroupMembers } from "@/lib/groupService";

export interface ClientInfo {
  userId: string;
  displayName: string;
  groupId: string;
  groupName: string;
}

/**
 * Flat list of the current user's active clients across all teams they coach.
 * Used to assign programs. RPC-backed (online).
 */
export function useClients() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const groups = await getMyGroups();
      const all: ClientInfo[] = [];
      for (const g of groups) {
        const members = await getGroupMembers(g.id);
        for (const m of members) {
          if (m.status === "active" && m.user_id) {
            all.push({
              userId: m.user_id,
              displayName: m.display_name,
              groupId: g.id,
              groupName: g.name,
            });
          }
        }
      }
      setClients(all);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { clients, loading, refresh };
}

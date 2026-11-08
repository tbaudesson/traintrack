"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyGroups, getGroupMembers } from "@/lib/groupService";

export interface ClientInfo {
  userId: string;
  displayName: string;
  groupId: string;
  groupName: string;
}

async function fetchClients(): Promise<ClientInfo[]> {
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
  return all;
}

/**
 * Flat list of the current user's active clients across all teams they coach.
 * Used to assign programs. RPC-backed (online).
 */
export function useClients() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      fetchClients()
        .catch((): ClientInfo[] => [])
        .then((all) => {
          setClients(all);
          setLoading(false);
        }),
    []
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { clients, loading, refresh };
}

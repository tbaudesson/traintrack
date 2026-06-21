import { useLiveQuery } from "dexie-react-hooks";
import db, { type Message } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** All non-deleted messages involving the current user (sent or received). */
export function useAllMessages() {
  return useLiveQuery(async () => {
    const uid = getCurrentUserIdSync();
    const all = await db.messages.filter((m) => !m.deletedAt).toArray();
    const mine = uid ? all.filter((m) => m.userId === uid || m.recipientId === uid) : all;
    return mine.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }, []) ?? [];
}

/** Messages exchanged with one other user, oldest first. */
export function useConversation(otherId: string | undefined) {
  return useLiveQuery(async () => {
    if (!otherId) return [];
    const uid = getCurrentUserIdSync();
    const all = await db.messages.filter((m) => !m.deletedAt).toArray();
    return all
      .filter(
        (m) =>
          (m.userId === uid && m.recipientId === otherId) ||
          (m.userId === otherId && m.recipientId === uid)
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }, [otherId]) ?? [];
}

export async function sendMessage(recipientId: string, body: string): Promise<number> {
  const now = new Date().toISOString();
  const id = (await db.messages.add({
    recipientId,
    body: body.trim(),
    readAt: null,
    uuid: crypto.randomUUID(),
    userId: getCurrentUserIdSync(),
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  } as Message)) as number;
  schedulePush();
  return id;
}

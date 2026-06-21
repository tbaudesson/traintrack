import { supabase } from "./supabase";

export interface MessageableUser {
  user_id: string;
  display_name: string;
  relation: "client" | "trainer";
}

/** People the current user is allowed to message (their clients + trainers). */
export async function getMessageableUsers(): Promise<MessageableUser[]> {
  const { data, error } = await supabase.rpc("get_messageable_users");
  if (error) throw new Error(error.message);
  return (data as MessageableUser[]) ?? [];
}

/** Mark all messages received from `otherId` as read (server-side). */
export async function markMessagesRead(otherId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_messages_read", { p_other: otherId });
  if (error) throw new Error(error.message);
}

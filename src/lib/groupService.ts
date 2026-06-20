import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────
// A "group" is a coaching team: the owner is the trainer, members are clients.

export interface Group {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  user_id: string | null;
  role: string; // "member" | "manager"
  status: string; // "pending" | "active"
  invited_email: string;
  display_name: string;
  invited_at: string;
  joined_at: string | null;
}

export interface GroupMembership {
  member_id: string;
  group_id: string;
  group_name: string;
  owner_name: string;
  role: string;
  status: string;
  member_count: number;
}

export interface GroupNotification {
  id: string;
  group_id: string;
  group_name: string;
  type: string;
  title: string;
  params: Record<string, string> | null;
  read: boolean;
  created_at: string;
}

// ─── Group CRUD ──────────────────────────────────────────────────────

export async function createGroup(name: string, description?: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_description: description ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function updateGroup(
  groupId: string,
  name: string,
  description?: string
): Promise<void> {
  const { error } = await supabase.rpc("update_group", {
    p_group_id: groupId,
    p_name: name,
    p_description: description ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_group", { p_group_id: groupId });
  if (error) throw new Error(error.message);
}

export async function getMyGroups(): Promise<Group[]> {
  const { data, error } = await supabase.rpc("get_my_groups");
  if (error) throw new Error(error.message);
  return (data as Group[]) ?? [];
}

// ─── Members & invitations ───────────────────────────────────────────

export async function inviteGroupMember(groupId: string, email: string): Promise<string> {
  const { data, error } = await supabase.rpc("invite_group_member", {
    p_group_id: groupId,
    p_email: email,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase.rpc("get_group_members", {
    p_group_id: groupId,
  });
  if (error) throw new Error(error.message);
  return (data as GroupMember[]) ?? [];
}

export async function removeGroupMember(memberId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_group_member", {
    p_member_id: memberId,
  });
  if (error) throw new Error(error.message);
}

export async function respondToInvitation(memberId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc("respond_to_invitation", {
    p_member_id: memberId,
    p_accept: accept,
  });
  if (error) throw new Error(error.message);
}

export async function getMyMemberships(): Promise<GroupMembership[]> {
  const { data, error } = await supabase.rpc("get_my_memberships");
  if (error) throw new Error(error.message);
  return (data as GroupMembership[]) ?? [];
}

/**
 * Auto-claim any pending invitations matching the current user's email.
 * Returns the number of invitations claimed.
 */
export async function claimPendingInvitations(): Promise<number> {
  const { data, error } = await supabase.rpc("claim_pending_invitations");
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function changeMemberRole(
  memberId: string,
  role: "member" | "manager"
): Promise<void> {
  const { error } = await supabase.rpc("change_member_role", {
    p_member_id: memberId,
    p_role: role,
  });
  if (error) throw new Error(error.message);
}

// ─── Group notifications ─────────────────────────────────────────────

export async function getGroupNotifications(): Promise<GroupNotification[]> {
  const { data, error } = await supabase.rpc("get_group_notifications");
  if (error) throw new Error(error.message);
  return (data as GroupNotification[]) ?? [];
}

export async function markGroupNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_group_notification_read", {
    p_notification_id: notificationId,
  });
  if (error) throw new Error(error.message);
}

export async function markAllGroupNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_group_notifications_read");
  if (error) throw new Error(error.message);
}

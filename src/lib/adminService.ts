import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin";
export type UserStatus = "pending" | "active" | "deactivated";
export type InvitationStatus = "pending" | "accepted" | "revoked";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  plan_id: string | null;
  plan_name: string;
  plan_features: string[];
}

export interface AdminUserProfile extends UserProfile {
  invited_by: string | null;
  updated_at: string;
  plan_id: string | null;
  plan_name: string;
}

export interface Invitation {
  id: string;
  email: string;
  invited_by: string;
  invited_by_name: string | null;
  status: InvitationStatus;
  plan_name: string | null;
  created_at: string;
}

// ─── Account Deletion ────────────────────────────────────────────────

/**
 * Delete the current user's account and all associated data (GDPR).
 * Calls the `delete_my_account` RPC which handles cascading deletion.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error(error.message);
}

// ─── Public Functions ─────────────────────────────────────────────────

/**
 * Check if an email has a pending invitation (used during signup).
 */
export async function checkInvitation(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_invitation", {
    p_email: email,
  });
  if (error) {
    console.error("checkInvitation error:", error);
    return false;
  }
  return data === true;
}

/**
 * Get the current user's profile (role + status).
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase.rpc("get_user_profile");
  if (error) {
    console.error("getUserProfile error:", error);
    return null;
  }
  // RPC returns an array for TABLE-returning functions
  const rows = data as UserProfile[];
  const row = rows?.[0] ?? null;
  if (row) {
    // Ensure plan_features is always an array (JSONB may come back as string)
    if (typeof row.plan_features === "string") {
      try { row.plan_features = JSON.parse(row.plan_features); } catch { row.plan_features = []; }
    }
    if (!Array.isArray(row.plan_features)) {
      row.plan_features = [];
    }
  }
  return row;
}

// ─── Admin Functions ──────────────────────────────────────────────────

/**
 * List all users (admin only).
 */
export async function adminListUsers(): Promise<AdminUserProfile[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) {
    console.error("adminListUsers error:", error);
    throw new Error(error.message);
  }
  return (data as AdminUserProfile[]) ?? [];
}

/**
 * Update a user's status (admin only).
 */
export async function adminUpdateUserStatus(
  userId: string,
  status: UserStatus
): Promise<void> {
  const { error } = await supabase.rpc("admin_update_user_status", {
    p_user_id: userId,
    p_status: status,
  });
  if (error) {
    console.error("adminUpdateUserStatus error:", error);
    throw new Error(error.message);
  }
}

/**
 * Set a user's role (admin only).
 */
export async function adminSetRole(
  userId: string,
  role: UserRole
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) {
    console.error("adminSetRole error:", error);
    throw new Error(error.message);
  }
}

/**
 * Create an invitation for an email (admin only).
 */
export async function adminCreateInvitation(email: string, planId?: string): Promise<string> {
  const { data, error } = await supabase.rpc("admin_create_invitation", {
    p_email: email,
    p_plan_id: planId ?? null,
  });
  if (error) {
    console.error("adminCreateInvitation error:", error);
    throw new Error(error.message);
  }
  return data as string;
}

/**
 * List all invitations (admin only).
 */
export async function adminListInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase.rpc("admin_list_invitations");
  if (error) {
    console.error("adminListInvitations error:", error);
    throw new Error(error.message);
  }
  return (data as Invitation[]) ?? [];
}

/**
 * Revoke a pending invitation (admin only).
 */
export async function adminRevokeInvitation(id: string): Promise<void> {
  const { error } = await supabase.rpc("admin_revoke_invitation", {
    p_id: id,
  });
  if (error) {
    console.error("adminRevokeInvitation error:", error);
    throw new Error(error.message);
  }
}

import { supabase } from "./supabase";

export type ChallengeType = "volume" | "sessions" | "consistency";

export interface Challenge {
  id: string;
  group_id: string;
  group_name: string;
  name: string;
  type: ChallengeType;
  start_date: string;
  end_date: string;
  is_owner: boolean;
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  score: number;
}

export async function getMyChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase.rpc("get_my_challenges");
  if (error) throw new Error(error.message);
  return (data as Challenge[]) ?? [];
}

export async function createChallenge(input: {
  groupId: string;
  name: string;
  type: ChallengeType;
  start: string;
  end: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_challenge", {
    p_group_id: input.groupId,
    p_name: input.name,
    p_type: input.type,
    p_start: input.start,
    p_end: input.end,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_challenge", { p_challenge_id: challengeId });
  if (error) throw new Error(error.message);
}

export async function getChallengeLeaderboard(challengeId: string): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("get_challenge_leaderboard", {
    p_challenge_id: challengeId,
  });
  if (error) throw new Error(error.message);
  return (data as LeaderboardRow[]) ?? [];
}

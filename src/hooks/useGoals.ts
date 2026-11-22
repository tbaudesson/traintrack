import { useLiveQuery } from "dexie-react-hooks";
import db, { type Goal } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";
import { byPriority } from "@/lib/goalTracking";

/** One's goals (or a client's, for a coach), the main one first. */
export function useGoals(userId?: string | null) {
  return (
    useLiveQuery(async () => {
      const uid = userId ?? getCurrentUserIdSync();
      const all = await db.goals.filter((g) => !g.deletedAt).toArray();
      return byPriority(uid ? all.filter((g) => g.userId === uid || (!userId && g.userId == null)) : all);
    }, [userId]) ?? []
  );
}

export type NewGoal = Pick<Goal, "type" | "targetValue"> & Partial<Pick<Goal, "scope" | "exerciseUuid" | "exerciseName" | "distanceM" | "startValue" | "deadline" | "priority">>;

/** A new goal. Made the main one, it takes the place of the previous main goal. */
export async function createGoal(goal: NewGoal): Promise<number> {
  const now = new Date().toISOString();
  const uid = getCurrentUserIdSync();
  if (goal.priority === 1) await demoteMain(uid);
  const id = (await db.goals.add({
    type: goal.type,
    scope: goal.scope ?? null,
    exerciseUuid: goal.exerciseUuid ?? null,
    exerciseName: goal.exerciseName ?? null,
    distanceM: goal.distanceM ?? null,
    targetValue: goal.targetValue,
    startValue: goal.startValue ?? null,
    deadline: goal.deadline ?? null,
    priority: goal.priority ?? 2,
    uuid: crypto.randomUUID(),
    userId: uid,
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

async function demoteMain(uid: string | null): Promise<void> {
  const now = new Date().toISOString();
  const mains = await db.goals.filter((g) => !g.deletedAt && g.priority === 1 && (!uid || g.userId === uid || g.userId == null)).toArray();
  for (const g of mains) await db.goals.update(g.id!, { priority: 2, updatedAt: now, _dirty: 1 });
}

/** The goal shown on the home screen: one at a time. */
export async function setMainGoal(id: number, main: boolean): Promise<void> {
  if (main) await demoteMain(getCurrentUserIdSync());
  await db.goals.update(id, { priority: main ? 1 : 2, updatedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

export async function deleteGoal(id: number): Promise<void> {
  await db.goals.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

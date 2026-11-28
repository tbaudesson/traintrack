import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";

/**
 * A device that had the tennis notebook (version 11) opens the group lessons'
 * (version 12): its groups and lessons move over, its own drills become its
 * own exercises, nothing is lost.
 */
describe("the local database, from the tennis notebook to the group lessons", () => {
  it("moves the groups and lessons, and turns one's own drills into one's exercises", async () => {
    const old = new Dexie("TrainTrack");
    old.version(11).stores({
      exercises: "++id, name, muscleGroup, uuid, _dirty",
      tennisGroups: "++id, uuid, _dirty, userId",
      tennisDrills: "++id, uuid, _dirty, userId",
      tennisLessons: "++id, groupId, date, uuid, _dirty, userId",
    });
    await old.open();
    const g = (await old.table("tennisGroups").add({ uuid: "g1", userId: "u1", kind: "tennis", name: "Mardi", slots: [], _dirty: 1 })) as number;
    await old.table("tennisLessons").add({ uuid: "l1", userId: "u1", groupId: g, date: "2026-12-01", plan: [{ drill: "d1", name: "Mon jeu", category: "games", minutes: 8 }], _dirty: 1 });
    await old.table("tennisDrills").add({ uuid: "d1", userId: "u1", name: "Mon jeu", category: "games", minutes: 8, ages: ["8-10"], equipment: ["cones"], _dirty: 1 });
    await old.table("tennisDrills").add({ uuid: "lib", userId: null, name: "Mini-tennis", category: "warmup", minutes: 10, ages: [], equipment: [], _dirty: 0 });
    old.close();

    const db = (await import("@/db")).default;
    await db.open();
    const groups = await db.lessonGroups.toArray();
    expect(groups).toMatchObject([{ uuid: "g1", kind: "lessons", sport: "tennis", name: "Mardi", _dirty: 1 }]);
    const lessons = await db.groupLessons.toArray();
    expect(lessons).toMatchObject([{ uuid: "l1", groupId: groups[0].id, date: "2026-12-01" }]);
    expect(lessons[0].plan[0]).toMatchObject({ drill: "d1", name: "Mon jeu" });
    const exercises = await db.exercises.toArray();
    // One's own drill, one's own exercise; the library's comes back from the server.
    expect(exercises).toMatchObject([{ uuid: "d1", name: "Mon jeu", isCustom: true, sport: "tennis", theme: "games", minutes: 8, ages: ["8-10"], gear: ["cones"], _dirty: 1 }]);
    expect(db.tables.map((t) => t.name)).not.toContain("tennisDrills");
  });
});

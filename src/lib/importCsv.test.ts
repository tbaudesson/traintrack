import { describe, expect, it } from "vitest";
import { matchExercise, parseCsv, parseHistory } from "./importCsv";

const strong = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2026-10-05 18:02:11,"Push, heavy",1h 5m,Bench Press (Barbell),W,40,10,0,0,,,
2026-10-05 18:02:11,"Push, heavy",1h 5m,Bench Press (Barbell),1,100,5,0,0,,,8
2026-10-05 18:02:11,"Push, heavy",1h 5m,Plank,1,0,0,0,45,,,
2026-10-05 18:02:11,"Push, heavy",1h 5m,Running,1,0,0,5,1500,,,
2026-10-07 07:30:00,Legs,45m,Squat (Barbell),1,220,5,0,0,"felt ""good""",,
`;

const hevy = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Upper A","12 Oct 2026, 09:00","12 Oct 2026, 10:10","","Lat Pulldown (Cable)","0","","0","warmup","30","12","","",""
"Upper A","12 Oct 2026, 09:00","12 Oct 2026, 10:10","","Lat Pulldown (Cable)","0","","1","normal","60","10","","","8.5"
"Upper A","12 Oct 2026, 09:00","12 Oct 2026, 10:10","","Face Pull (Cable)","0","","0","normal","20","15","","",""
`;

describe("CSV import", () => {
  it("read quoted fields and doubled quotes", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\n1,2,3', ",")).toEqual([["a", "b, c", 'say "hi"'], ["1", "2", "3"]]);
  });

  it("read a Strong export, in pounds when asked", () => {
    const history = parseHistory(strong, "lb")!;
    expect(history.source).toBe("strong");
    expect(history.unitAsked).toBe(true);
    expect(history.skipped).toBe(1);
    const [push, legs] = history.workouts;
    expect(push).toMatchObject({ date: "2026-10-05", title: "Push, heavy", durationMin: 65 });
    expect(push.sets.map((s) => [s.exercise, s.weightKg, s.reps, s.isWarmup, s.rpe])).toEqual([
      ["Bench Press (Barbell)", 18.1, 10, true, undefined],
      ["Bench Press (Barbell)", 45.4, 5, false, 8],
      ["Plank", undefined, 45, false, undefined],
    ]);
    expect(legs).toMatchObject({ date: "2026-10-07", durationMin: 45 });
    expect(legs.sets[0].weightKg).toBe(99.8);
  });

  it("read a Hevy export with its warm-ups, supersets and duration", () => {
    const history = parseHistory(hevy)!;
    expect(history.source).toBe("hevy");
    expect(history.unitAsked).toBe(false);
    const [upper] = history.workouts;
    expect(upper).toMatchObject({ date: "2026-10-12", title: "Upper A", durationMin: 70 });
    expect(upper.sets.map((s) => [s.exercise, s.weightKg, s.isWarmup, s.rpe, s.superset])).toEqual([
      ["Lat Pulldown (Cable)", 30, true, undefined, "0"],
      ["Lat Pulldown (Cable)", 60, false, 8.5, "0"],
      ["Face Pull (Cable)", 20, false, undefined, "0"],
    ]);
  });

  it("read semicolons and refuse an unknown file", () => {
    expect(parseHistory(strong.replace(/,/g, ";").replaceAll('"Push; heavy"', "Push"))?.workouts).toHaveLength(2);
    expect(parseHistory("name,value\na,1")).toBeNull();
  });

  it("match the names of other apps to the library", () => {
    const library = ["Barbell Bench Press", "Back Squat", "Lat Pulldown", "Face Pull", "Plank", "Pull-up"].map((name) => ({ name }));
    expect(matchExercise("Bench Press (Barbell)", library)?.name).toBe("Barbell Bench Press");
    expect(matchExercise("Squat (Barbell)", library)?.name).toBe("Back Squat");
    expect(matchExercise("Lat Pulldown (Cable)", library)?.name).toBe("Lat Pulldown");
    expect(matchExercise("Pull Up", library)?.name).toBe("Pull-up");
    expect(matchExercise("plank", library)?.name).toBe("Plank");
    expect(matchExercise("Zercher Squat", library)).toBeUndefined();
    expect(matchExercise("Cable Crossover", [{ name: "Cable Fly" }])?.name).toBe("Cable Fly");
  });
});

describe("CSV export", () => {
  it("write a Strong-like file that reads back the same", async () => {
    const { sessionsCsv } = await import("./exportService");
    const csv = sessionsCsv(
      [{ id: 1, date: "2026-11-02", title: "Push, heavy", durationMin: 65 }],
      [
        { workoutId: 1, exerciseId: 7, setNumber: 1, weightKg: 100, reps: 5, rpe: 8, completed: true },
        { workoutId: 1, exerciseId: 7, setNumber: 1, weightKg: 40, reps: 10, completed: true, isWarmup: true },
        { workoutId: 1, exerciseId: 7, setNumber: 2, weightKg: 100, reps: 4, completed: false },
      ],
      () => "Barbell Bench Press"
    );
    const back = parseHistory(csv)!;
    expect(back.workouts).toHaveLength(1);
    expect(back.workouts[0]).toMatchObject({ date: "2026-11-02", title: "Push, heavy", durationMin: 65 });
    expect(back.workouts[0].sets.map((s) => [s.weightKg, s.reps, s.isWarmup, s.rpe])).toEqual([
      [40, 10, true, undefined],
      [100, 5, false, 8],
    ]);
  });
});

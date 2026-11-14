import type { MuscleGroup } from "@/db";

/**
 * Exercises a vaulter trains off the horse, added to the library by
 * migration 040: balance, handstand, arch and splits, the qualities the
 * compulsory and freestyle figures ask for.
 */
export const VAULTING_EXERCISES: { name: string; muscleGroup: MuscleGroup; description: string }[] = [
  { name: "Handstand Hold", muscleGroup: "shoulders", description: "Facing a wall or with your back to it, hands shoulder-width apart, body straight and tight. Hold." },
  { name: "Single-Leg Balance", muscleGroup: "legs", description: "Stand on one leg, the other knee raised, eyes fixed on a point. Harder with eyes closed or on a cushion." },
  { name: "Arabesque Hold", muscleGroup: "legs", description: "On one leg, lean forward and raise the other leg behind you to hip height, arms out. Hold, back long." },
  { name: "Superman Hold", muscleGroup: "back", description: "Face down, raise the arms and legs off the floor, glutes tight, neck long. Hold." },
  { name: "Tuck Jump", muscleGroup: "legs", description: "Jump and pull both knees up to the chest, then land softly on the balls of the feet." },
  { name: "Bridge Hold", muscleGroup: "back", description: "On your back, hands by the ears, push up to an arch, arms and legs as straight as possible. Hold." },
  { name: "Front Split Stretch", muscleGroup: "legs", description: "One leg forward, the other back, hips square. Go down slowly with blocks under the hands; never force." },
  { name: "Pike Stretch", muscleGroup: "legs", description: "Seated, legs together and straight, fold forward at the hips with a long back. Breathe and relax." },
];

import { useAppGuidance } from "@/hooks/useAppGuidance";
import { LESSONS_REFERENCE_KEY, parseLessonsReference, type LessonsReference } from "@/lib/lessonsReference";

/** The sports of the group lessons and their lists, as the admin keeps them; null until read once. */
export const useLessonsReference = (): LessonsReference | null => useAppGuidance(LESSONS_REFERENCE_KEY, parseLessonsReference);

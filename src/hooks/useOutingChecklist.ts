import { OUTING_CHECKLIST_KEY, parseChecklist, type ChecklistSection } from "@/lib/outingChecklist";
import { useAppGuidance } from "./useAppGuidance";

/** The pre-departure checklist the admin keeps; null until it has been read once. */
export const useOutingChecklist = (): ChecklistSection[] | null => useAppGuidance(OUTING_CHECKLIST_KEY, parseChecklist);

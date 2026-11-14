"use client";

import { useParams } from "next/navigation";
import { SessionLogger } from "./SessionLogger";

/** The older address of a session, kept for links already shared. */
export default function SessionByPathPage() {
  const id = Number(useParams().id);
  return <SessionLogger key={id} workoutId={id} />;
}

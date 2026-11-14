"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SessionLogger } from "../[id]/SessionLogger";

function ById() {
  const params = useSearchParams();
  const id = Number(params.get("id"));
  // ?guided=1: the session opens in guided mode (a beginner's first one).
  return id > 0 ? <SessionLogger key={id} workoutId={id} startGuided={params.get("guided") === "1"} /> : null;
}

/**
 * A session, by ?id=. One fixed address for every session: cached once, it
 * opens offline even for a session started without network, whose number the
 * server has never seen.
 */
export default function SessionPage() {
  return (
    <Suspense>
      <ById />
    </Suspense>
  );
}

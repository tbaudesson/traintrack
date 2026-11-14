"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SessionLogger } from "../[id]/SessionLogger";

function ById() {
  const id = Number(useSearchParams().get("id"));
  return id > 0 ? <SessionLogger key={id} workoutId={id} /> : null;
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

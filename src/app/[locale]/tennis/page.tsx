"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** The tennis notebook's former address: the group lessons' notebook now. */
export default function TennisPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lessons");
  }, [router]);
  return null;
}

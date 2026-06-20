"use client";

import { useEffect } from "react";
import { initTextSize } from "@/lib/textSize";

export function ThemeInit() {
  useEffect(() => {
    // Light/dark mode (follows system unless explicitly stored)
    const stored = localStorage.getItem("traintrack-theme") ?? "system";
    const resolved =
      stored === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : stored;
    document.documentElement.classList.toggle("dark", resolved === "dark");

    // Accessibility text size
    initTextSize();
  }, []);

  return null;
}

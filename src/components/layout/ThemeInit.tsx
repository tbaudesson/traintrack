"use client";

import { useEffect } from "react";

export function ThemeInit() {
  useEffect(() => {
    // Light/dark mode
    const stored = localStorage.getItem("rucher-theme") ?? "system";
    const resolved =
      stored === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : stored;
    document.documentElement.classList.toggle("dark", resolved === "dark");

    // Design theme
    const designTheme = localStorage.getItem("rucher-design-theme") ?? "classic";
    const themeClasses = ["theme-classic", "theme-nature", "theme-modern", "theme-playful"];
    document.documentElement.classList.remove(...themeClasses);
    document.documentElement.classList.add(`theme-${designTheme}`);

    // Accessibility
    const textSize = localStorage.getItem("rucher-a11y-text");
    if (textSize === "large") document.documentElement.classList.add("text-large");
    if (textSize === "extra-large") document.documentElement.classList.add("text-extra-large");
  }, []);

  return null;
}

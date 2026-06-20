"use client";

import { useEffect } from "react";
import { initTextSize } from "@/lib/textSize";
import { initAppTheme } from "@/lib/appTheme";

export function ThemeInit() {
  useEffect(() => {
    initAppTheme(); // light/dark mode + accent color
    initTextSize(); // accessibility text size
  }, []);

  return null;
}

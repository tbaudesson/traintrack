// App-wide text scaling for accessibility. Sets the root font-size so every
// rem-based size scales together.

export type TextSize = "small" | "normal" | "large";

const KEY = "traintrack.textSize";
const ROOT_PX: Record<TextSize, string> = {
  small: "15px",
  normal: "17px",
  large: "20px",
};

export function getTextSize(): TextSize {
  if (typeof window === "undefined") return "normal";
  const v = window.localStorage.getItem(KEY);
  return v === "small" || v === "large" ? v : "normal";
}

export function applyTextSize(size: TextSize): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = ROOT_PX[size];
  window.localStorage.setItem(KEY, size);
}

export function initTextSize(): void {
  applyTextSize(getTextSize());
}

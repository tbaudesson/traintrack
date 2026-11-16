/**
 * A vibration. Android: the Vibration API. iPhone: Safari has no Vibration
 * API, but since iOS 18 flipping a native switch gives a short haptic tap, so
 * a hidden switch is flipped once per pulse. Older iPhones stay silent.
 */
let iosSwitch: HTMLLabelElement | null = null;

function iosTap(): void {
  if (typeof document === "undefined") return;
  if (!iosSwitch) {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-10px;top:0";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

export const canVibrate = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/** Vibrate in pulses: [on, off, on, …] in milliseconds, as for navigator.vibrate. */
export function vibrate(pattern: number | number[]): void {
  const steps = Array.isArray(pattern) ? pattern : [pattern];
  try {
    if (canVibrate()) {
      navigator.vibrate(steps);
      return;
    }
    // One tap per "on" step, spaced like the pattern.
    let at = 0;
    steps.forEach((ms, i) => {
      if (i % 2 === 0) setTimeout(iosTap, at);
      at += ms;
    });
  } catch {
    // No vibration on this device.
  }
}

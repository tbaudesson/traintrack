import { useEffect, useRef, useState } from "react";
import { connectHeartRate, isBluetoothSupported, type HeartRateMonitor } from "@/lib/bleHeartRate";

/**
 * A Bluetooth heart-rate belt for a session: connected on demand, its beats
 * kept while it runs, the average and the maximum handed back at the end.
 * Web Bluetooth only (Chrome on Android and desktop; not Safari on iPhone).
 */
export function useHeartRateMonitor() {
  const [bpm, setBpm] = useState<number | null>(null);
  const [stats, setStats] = useState<{ avg: number; max: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<"unsupported" | "failed" | null>(null);
  const monitor = useRef<HeartRateMonitor | null>(null);
  const samples = useRef<number[]>([]);

  useEffect(() => () => void monitor.current?.stop(), []);

  async function connect() {
    setError(null);
    setConnecting(true);
    try {
      monitor.current = await connectHeartRate(
        (beat) => {
          samples.current.push(beat);
          setBpm(beat);
          const s = samples.current;
          setStats({ avg: Math.round(s.reduce((a, b) => a + b, 0) / s.length), max: Math.max(...s) });
        },
        () => {
          monitor.current = null;
          setConnected(false);
          setBpm(null);
        }
      );
      setConnected(true);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      // The chooser closed by the athlete is no error.
      if (!/cancel|user gesture|chooser/i.test(code)) setError(code === "BLE_UNSUPPORTED" ? "unsupported" : "failed");
    } finally {
      setConnecting(false);
    }
  }

  /** Stops the belt; the average and maximum of the beats kept, if any. */
  async function finish(): Promise<{ avgHr: number; maxHr: number } | null> {
    await monitor.current?.stop();
    monitor.current = null;
    setConnected(false);
    setBpm(null);
    const s = samples.current;
    return s.length ? { avgHr: Math.round(s.reduce((a, b) => a + b, 0) / s.length), maxHr: Math.max(...s) } : null;
  }

  return { supported: isBluetoothSupported(), bpm, stats, connected, connecting, error, connect, finish };
}

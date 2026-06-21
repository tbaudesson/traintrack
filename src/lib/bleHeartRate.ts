// Web Bluetooth live heart-rate monitor using the standard BLE Heart Rate
// Profile (service 0x180D, characteristic 0x2A37). Works on Android Chrome and
// desktop Chrome/Edge. iOS Safari does NOT support Web Bluetooth.

export interface HeartRateMonitor {
  deviceName: string;
  stop: () => Promise<void>;
}

/** Whether this browser exposes the Web Bluetooth API. */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

// Minimal typings (Web Bluetooth isn't in the default TS DOM lib everywhere).
interface BluetoothLike {
  requestDevice(opts: { filters: { services: (number | string)[] }[] }): Promise<BluetoothDeviceLike>;
}
interface BluetoothDeviceLike {
  name?: string;
  gatt?: {
    connect(): Promise<BluetoothGATTServer>;
    disconnect(): void;
    connected: boolean;
  };
  addEventListener(type: string, cb: () => void): void;
}
interface BluetoothGATTServer {
  getPrimaryService(s: number | string): Promise<{
    getCharacteristic(c: number | string): Promise<BluetoothChar>;
  }>;
}
interface BluetoothChar {
  startNotifications(): Promise<BluetoothChar>;
  stopNotifications(): Promise<BluetoothChar>;
  addEventListener(type: "characteristicvaluechanged", cb: (e: Event) => void): void;
  value?: DataView;
}

/** Parse a Heart Rate Measurement characteristic value into BPM. */
function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const is16bit = flags & 0x1;
  return is16bit ? value.getUint16(1, true) : value.getUint8(1);
}

/**
 * Prompt the user to pick a BLE heart-rate device and stream BPM via onChange.
 * Throws "BLE_UNSUPPORTED" if unavailable, or rethrows the user-cancel error.
 */
export async function connectHeartRate(
  onChange: (bpm: number) => void,
  onDisconnect?: () => void
): Promise<HeartRateMonitor> {
  if (!isBluetoothSupported()) throw new Error("BLE_UNSUPPORTED");
  const bt = (navigator as unknown as { bluetooth: BluetoothLike }).bluetooth;

  const device = await bt.requestDevice({ filters: [{ services: ["heart_rate"] }] });
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService("heart_rate");
  const char = await service.getCharacteristic("heart_rate_measurement");

  const handler = (e: Event) => {
    const v = (e.target as unknown as BluetoothChar).value;
    if (v) onChange(parseHeartRate(v));
  };
  char.addEventListener("characteristicvaluechanged", handler);
  await char.startNotifications();

  if (onDisconnect) device.addEventListener("gattserverdisconnected", onDisconnect);

  return {
    deviceName: device.name ?? "Heart-rate monitor",
    stop: async () => {
      try {
        await char.stopNotifications();
      } catch {
        /* ignore */
      }
      try {
        device.gatt?.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

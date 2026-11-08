import { getAppSetting, setAppSetting } from "@guntan/db";
import { writeSyncHoursFile } from "./server-sync";

const KEY = "sync_schedule_hours";

export function parseHours(value: string): number[] {
  const hours = value
    .split(/[,\s]+/)
    .map((h) => Number.parseInt(h.replace(/:.*$/, ""), 10))
    .filter((h) => Number.isInteger(h) && h >= 0 && h < 24);
  return [...new Set(hours)].sort((a, b) => a - b);
}

/**
 * Zamanlanmış görevin çalıştığı saatler (Türkiye saati). Panelden ayarlanır; sunucudaki
 * kuyruk cron'u (scripts/sync-queue.sh) saatleri okuyabilsin diye dosyaya da yazılır.
 */
export async function getSyncHours(): Promise<number[]> {
  const saved = await getAppSetting<number[]>(KEY).catch(() => null);
  const fromEnv = parseHours(process.env.SUPPLIER_SYNC_HOURS ?? "");
  const hours = saved?.value?.length ? saved.value : fromEnv.length ? fromEnv : [6, 18];
  writeSyncHoursFile(hours);
  return hours;
}

export async function saveSyncHours(hours: number[]) {
  await setAppSetting(KEY, hours);
  writeSyncHoursFile(hours);
}

/** İki planlı çalışma arasındaki en uzun boşluk (saat). */
export function syncIntervalHours(hours: number[]): number {
  if (hours.length < 2) return 24;
  let max = 24 - hours[hours.length - 1]! + hours[0]!;
  for (let i = 1; i < hours.length; i++) max = Math.max(max, hours[i]! - hours[i - 1]!);
  return max;
}

export function describeHours(hours: number[]) {
  const list = hours.map((h) => `${String(h).padStart(2, "0")}:00`);
  return hours.length === 1 ? `her gün ${list[0]}` : `her gün ${list.join(", ")}`;
}

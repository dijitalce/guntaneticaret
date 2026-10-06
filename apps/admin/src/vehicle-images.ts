import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

export const VEHICLE_IMAGE_MAX_BYTES = 800 * 1024;
export const VEHICLE_IMAGE_PREFIX = "/arac-gorsel/";

const EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export function vehicleImageType(bytes: Buffer): keyof typeof EXT | null {
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

/**
 * hostinger-start.mjs /arac-gorsel/ isteklerini ürün görsel klasörünün kardeşi olan
 * guntan-images/vehicles klasöründen sunar; deploy klasörü her yayında sıfırlandığı için dışarıda tutulur.
 */
function resolveDir(): string | null {
  if (process.env.PRODUCT_IMAGE_DIR) return join(dirname(process.env.PRODUCT_IMAGE_DIR), "vehicles");
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "guntan-images", "files"))) return join(dir, "guntan-images", "vehicles");
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.env.NODE_ENV === "production" ? null : join(tmpdir(), "guntan-images", "vehicles");
}

export async function saveVehicleImage(prefix: string, bytes: Buffer, type: keyof typeof EXT): Promise<string> {
  const dir = resolveDir();
  if (!dir) throw new Error("Görsel klasörü bulunamadı (guntan-images).");
  await mkdir(dir, { recursive: true });
  const name = `${prefix}-${Date.now().toString(36)}.${EXT[type]}`;
  await writeFile(join(dir, name), bytes);
  return `${VEHICLE_IMAGE_PREFIX}${name}`;
}

export async function deleteVehicleImage(url: string | null | undefined) {
  if (!url?.startsWith(VEHICLE_IMAGE_PREFIX)) return;
  const dir = resolveDir();
  if (!dir) return;
  await unlink(join(dir, basename(url))).catch(() => {});
}

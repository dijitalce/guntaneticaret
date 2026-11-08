import { existsSync, readFileSync, writeFileSync } from "node:fs";

/*
 * Görsel işleri her çalışmada görseli olmayan tüm ürünleri (870 bin+) belleğe alıyordu; tek iş 2 GB
 * belleğe çıkıp barındırma bellek sınırını dolduruyor, ama süresi içinde ancak birkaç bin ürün
 * işleyebiliyordu. Bunun yerine ürünler id sırasıyla parça parça okunur; son işlenen id dosyada
 * saklanır, sonraki parça/çalışma oradan sürer, sona gelince başa döner.
 */

export const IMAGE_CHUNK_SIZE = Number(process.env.IMAGE_CANDIDATE_CHUNK || 20_000);

export function readImageCursor(file: string): string {
  try {
    return existsSync(file) ? readFileSync(file, "utf8").trim() : "";
  } catch {
    return "";
  }
}

export function writeImageCursor(file: string, id: string) {
  try {
    writeFileSync(file, `${id}\n`);
  } catch {
    /* yazılamazsa sonraki çalışma aynı parçayı yeniden dener */
  }
}

/**
 * İmleçten sonraki parçayı getirir; sona gelindiyse imleci sıfırlayıp baştan dener.
 * `load(afterId, limit)` id'ye göre artan sırada en fazla `limit` satır döndürmeli.
 */
export async function nextImageChunk<T extends { id: string }>(
  cursorFile: string,
  load: (afterId: string, limit: number) => Promise<T[]>,
): Promise<{ rows: T[]; wrapped: boolean }> {
  const after = readImageCursor(cursorFile);
  const rows = await load(after, IMAGE_CHUNK_SIZE);
  if (rows.length > 0 || after === "") return { rows, wrapped: false };
  writeImageCursor(cursorFile, "");
  return { rows: await load("", IMAGE_CHUNK_SIZE), wrapped: true };
}

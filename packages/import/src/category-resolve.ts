import { asc, eq } from "drizzle-orm";
import { categories, db, newId } from "@guntan/db";
import { inferCategory, type InferredCategory } from "./category-from-name";

type Known = { id: string; path: string };

let known: Promise<Map<string, Known>> | null = null;

/** Slug → kategori. Aynı slug birden çok yerde varsa mağazanın açtığı satır (yol sırasına göre ilk etkin) seçilir. */
function loadKnown() {
  known ??= db
    .select({ id: categories.id, slug: categories.slug, path: categories.path })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.path))
    .then((rows) => {
      const map = new Map<string, Known>();
      for (const r of rows) if (!map.has(r.slug)) map.set(r.slug, { id: r.id, path: r.path });
      return map;
    });
  return known;
}

async function ensure(map: Map<string, Known>, slug: string, name: string, parent: Known | null): Promise<Known> {
  const hit = map.get(slug);
  if (hit) return hit;
  const path = parent ? `${parent.path}/${slug}` : slug;
  await db.insert(categories).ignore().values({ id: newId(), name, slug, path, parentId: parent?.id ?? null, sortOrder: parent ? 0 : 50 });
  const [row] = await db.select({ id: categories.id, path: categories.path }).from(categories).where(eq(categories.path, path)).limit(1);
  if (!row) throw new Error(`Kategori oluşturulamadı: ${path}`);
  map.set(slug, row);
  return row;
}

/** Çıkarılan kategorinin kimliği; yoksa (üst grubuyla birlikte) oluşturulur. */
export async function resolveInferredCategory(inferred: InferredCategory): Promise<string> {
  const map = await loadKnown();
  const parent = inferred.parentSlug ? await ensure(map, inferred.parentSlug, inferred.parentName ?? inferred.parentSlug, null) : null;
  return (await ensure(map, inferred.slug, inferred.name, parent)).id;
}

/** Tedarikçi kategori vermediğinde ürün adından bulunan kategorinin kimliği; ad tanınmazsa `null`. */
export async function inferredCategoryId(productName: string): Promise<string | null> {
  const inferred = inferCategory(productName);
  return inferred ? resolveInferredCategory(inferred) : null;
}

import { asc, eq, sql } from "drizzle-orm";
import { categories, db, newId } from "@guntan/db";
import { SEO_CATEGORIES, seoCategoryParentSlug } from "@guntan/types";
import { EXTRA_CATEGORY_PARENTS, inferCategory, type InferredCategory } from "./category-from-name";

type Known = { id: string; path: string; parentId: string | null };

let known: Promise<Map<string, Known>> | null = null;

/** Slug → kategori. Aynı slug birden çok yerde varsa en derin yolu (üst grubu olan) tercih edilir. */
function loadKnown() {
  known ??= db
    .select({
      id: categories.id,
      slug: categories.slug,
      path: categories.path,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.path))
    .then((rows) => {
      const map = new Map<string, Known>();
      for (const r of rows) {
        const prev = map.get(r.slug);
        // Daha derin / üstü olan satır kazanır (motor/piston > piston).
        if (!prev || r.path.length > prev.path.length || (r.parentId && !prev.parentId)) {
          map.set(r.slug, { id: r.id, path: r.path, parentId: r.parentId });
        }
      }
      return map;
    });
  return known;
}

/** Bilinen haritayı sıfırla (ağaç onarımı sonrası). */
export function resetCategoryCache() {
  known = null;
}

async function ensure(map: Map<string, Known>, slug: string, name: string, parent: Known | null): Promise<Known> {
  const expectedPath = parent ? `${parent.path}/${slug}` : slug;
  const expectedParentId = parent?.id ?? null;

  // Doğru path zaten varsa onu kullan; aynı slug’lı kökte kalmış kopyadan ürünleri birleştir.
  const [byPath] = await db
    .select({ id: categories.id, path: categories.path, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.path, expectedPath))
    .limit(1);
  if (byPath) {
    const orphan = map.get(slug);
    if (orphan && orphan.id !== byPath.id) {
      await db.execute(sql`
        insert ignore into product_categories (product_id, category_id)
        select product_id, ${byPath.id} from product_categories where category_id = ${orphan.id}`);
      await db.execute(sql`delete from product_categories where category_id = ${orphan.id}`);
      await db.update(categories).set({ isActive: false }).where(eq(categories.id, orphan.id));
    }
    const row = { id: byPath.id, path: byPath.path, parentId: byPath.parentId };
    map.set(slug, row);
    return row;
  }

  const hit = map.get(slug);
  if (hit) {
    // Slug var ama path/parent yanlış (ör. piston kökte kalmış) → motor altına taşı.
    if (hit.path !== expectedPath || hit.parentId !== expectedParentId) {
      await db
        .update(categories)
        .set({ path: expectedPath, parentId: expectedParentId, name })
        .where(eq(categories.id, hit.id));
      const fixed = { id: hit.id, path: expectedPath, parentId: expectedParentId };
      map.set(slug, fixed);
      return fixed;
    }
    return hit;
  }

  await db.insert(categories).ignore().values({
    id: newId(),
    name,
    slug,
    path: expectedPath,
    parentId: expectedParentId,
    sortOrder: parent ? 0 : 50,
  });
  const [row] = await db
    .select({ id: categories.id, path: categories.path, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.path, expectedPath))
    .limit(1);
  if (!row) throw new Error(`Kategori oluşturulamadı: ${expectedPath}`);
  const knownRow = { id: row.id, path: row.path, parentId: row.parentId };
  map.set(slug, knownRow);
  return knownRow;
}

/** Çıkarılan kategorinin kimliği; yoksa (üst grubuyla birlikte) oluşturulur. */
export async function resolveInferredCategory(inferred: InferredCategory): Promise<string> {
  const map = await loadKnown();
  const parent = inferred.parentSlug
    ? await ensure(map, inferred.parentSlug, inferred.parentName ?? inferred.parentSlug, null)
    : null;
  return (await ensure(map, inferred.slug, inferred.name, parent)).id;
}

/** Tedarikçi kategori vermediğinde ürün adından bulunan kategorinin kimliği; ad tanınmazsa `null`. */
export async function inferredCategoryId(productName: string): Promise<string | null> {
  const inferred = inferCategory(productName);
  return inferred ? resolveInferredCategory(inferred) : null;
}

/**
 * SEO + EXTRA haritasına göre parentId/path düzeltir.
 * Böylece /kategori/motor gibi üst sayfalar alt kategorideki ürünleri de görür.
 */
export async function repairCategoryTree(): Promise<{ fixed: number }> {
  resetCategoryCache();
  const map = await loadKnown();
  let fixed = 0;

  const parentOf = new Map<string, string | null>();
  const nameOf = new Map<string, string>();
  for (const [slug, entry] of Object.entries(SEO_CATEGORIES)) {
    parentOf.set(slug, seoCategoryParentSlug(entry) ?? null);
    nameOf.set(slug, entry.name);
  }
  for (const [slug, entry] of Object.entries(EXTRA_CATEGORY_PARENTS)) {
    if (!parentOf.has(slug)) parentOf.set(slug, entry.parent);
    if (!nameOf.has(slug)) nameOf.set(slug, entry.name);
  }

  // Önce kökler, sonra çocuklar (parent path hazır olsun).
  const slugs = [...parentOf.keys()].sort((a, b) => {
    const da = parentOf.get(a) ? 1 : 0;
    const db = parentOf.get(b) ? 1 : 0;
    return da - db || a.localeCompare(b);
  });

  for (const slug of slugs) {
    const parentSlug = parentOf.get(slug) ?? null;
    const name = nameOf.get(slug) ?? slug;
    const parent = parentSlug
      ? await ensure(map, parentSlug, nameOf.get(parentSlug) ?? parentSlug, null)
      : null;
    const before = map.get(slug);
    const after = await ensure(map, slug, name, parent);
    if (!before || before.path !== after.path || before.parentId !== after.parentId) fixed += 1;
  }

  resetCategoryCache();
  return { fixed };
}

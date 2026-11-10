import { and, eq, inArray, sql } from "drizzle-orm";
import { PRODUCT_STATUS } from "@guntan/types";
import { db, pool } from "./client";
import { products } from "./schema";

export type PruneStats = {
  duplicateDescriptionsCleared: number;
  inactiveProductsDeleted: number;
  importErrorsDeleted: number;
  auditLogsDeleted: number;
  vacuumed: boolean;
  vacuumFull: boolean;
};

const DELETE_CHUNK = 400;

/**
 * Reclaim disk from catalog bloat: duplicate-name descriptions, unused
 * inactive products (and cascaded fitments/OEMs/images), old import errors.
 */
export async function pruneUnusedCatalog(options: { vacuumFull?: boolean } = {}): Promise<PruneStats> {
  const vacuumFull = options.vacuumFull ?? process.env.VACUUM_FULL === "1";

  await db.execute(sql`
    update products
    set description = null
    where description is not null
      and (description = name or length(description) = 0)
  `);

  // Yalnızca tedarikçi listesinden çıkmış ürünler silinir. "inactive" ürünler (en ucuz tedarikçi
  // seçiminde geride kalan kopyalar, elle pasife alınanlar) listede durduğu için silinmez: silinince
  // bir sonraki senkron onları yeni id'lerle uyumluluk/OEM satırlarıyla birlikte yeniden yaratıyor,
  // her gün yüz binlerce ürün silinip yazıldığı için veritabanı şişip kotayı aşıyordu.
  let inactiveProductsDeleted = 0;
  for (;;) {
    const doomed = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.status, PRODUCT_STATUS.MISSING_FROM_FEED),
          sql`not exists (select 1 from order_items oi where oi.product_id = ${products.id})`,
          sql`not exists (select 1 from cart_items ci where ci.product_id = ${products.id})`,
        ),
      )
      .limit(DELETE_CHUNK);
    if (doomed.length === 0) break;
    await db.delete(products).where(inArray(products.id, doomed.map((r) => r.id)));
    inactiveProductsDeleted += doomed.length;
    console.log(`Deleted inactive products: ${inactiveProductsDeleted}`);
  }

  await db.execute(sql`
    delete from xml_import_row_errors
    where run_id not in (
      select id from (
        select id from xml_import_runs
        order by created_at desc
        limit 3
      ) recent_runs
    )
  `);

  await db.execute(sql`
    delete from audit_logs
    where created_at < date_sub(now(), interval 30 day)
  `);

  // OPTIMIZE tabloyu yeniden yazar ve geçici olarak bir kopyası kadar yer kaplar (en büyük tablolarda
  // 2-3 GB). Kotaya yakın veritabanında her senkronda çalışınca ölçüm anında sınır aşılmış görünüyordu;
  // yalnızca elle istenince (VACUUM_FULL=1) çalışır.
  let vacuumed = false;
  const optimizeTables = vacuumFull ? [
    "products",
    "product_fitments",
    "product_oems",
    "product_images",
    "product_categories",
    "tenant_catalog_index",
    "xml_import_row_errors",
    "audit_logs",
  ] : [];
  try {
    for (const table of optimizeTables) {
      await pool.query(`optimize table \`${table}\``);
    }
    vacuumed = optimizeTables.length > 0;
  } catch (err) {
    console.warn("OPTIMIZE TABLE skipped:", err instanceof Error ? err.message : err);
  }

  // MySQL has no VACUUM FULL; OPTIMIZE already rewrites tables when possible.
  const didFull = vacuumFull && vacuumed;

  return {
    duplicateDescriptionsCleared: 0,
    inactiveProductsDeleted,
    importErrorsDeleted: 0,
    auditLogsDeleted: 0,
    vacuumed,
    vacuumFull: didFull,
  };
}

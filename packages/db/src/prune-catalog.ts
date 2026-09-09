import { and, inArray, sql } from "drizzle-orm";
import { PRODUCT_STATUS } from "@guntan/types";
import { db, pg } from "./client";
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

  let inactiveProductsDeleted = 0;
  for (;;) {
    const doomed = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          inArray(products.status, [PRODUCT_STATUS.INACTIVE, PRODUCT_STATUS.MISSING_FROM_FEED]),
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
      select id from xml_import_runs
      order by created_at desc
      limit 3
    )
  `);

  await db.execute(sql`
    delete from audit_logs
    where created_at < now() - interval '30 days'
  `);

  let vacuumed = false;
  try {
    await pg.unsafe("vacuum analyze products");
    await pg.unsafe("vacuum analyze product_fitments");
    await pg.unsafe("vacuum analyze product_oems");
    await pg.unsafe("vacuum analyze product_images");
    await pg.unsafe("vacuum analyze product_categories");
    await pg.unsafe("vacuum analyze tenant_catalog_index");
    await pg.unsafe("vacuum analyze xml_import_row_errors");
    await pg.unsafe("vacuum analyze audit_logs");
    vacuumed = true;
  } catch (err) {
    console.warn("VACUUM skipped (direct Postgres gerekir, pooler VACUUM kabul etmez):", err instanceof Error ? err.message : err);
  }

  let didFull = false;
  if (vacuumFull) {
    try {
      await pg.unsafe("vacuum full analyze product_fitments");
      await pg.unsafe("vacuum full analyze product_oems");
      await pg.unsafe("vacuum full analyze product_images");
      await pg.unsafe("vacuum full analyze product_categories");
      await pg.unsafe("vacuum full analyze tenant_catalog_index");
      await pg.unsafe("vacuum full analyze products");
      didFull = true;
    } catch (err) {
      console.warn("VACUUM FULL skipped:", err instanceof Error ? err.message : err);
    }
  }

  return {
    duplicateDescriptionsCleared: 0,
    inactiveProductsDeleted,
    importErrorsDeleted: 0,
    auditLogsDeleted: 0,
    vacuumed,
    vacuumFull: didFull,
  };
}

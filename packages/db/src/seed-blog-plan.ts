import { eq } from "drizzle-orm";
import { pool, db } from "./client";
import { tenants } from "./schema/tenant";
import { seedBlogPlan } from "./ext/blog-plan";

/** SEO haritasındaki blog konularını taslak yükler. TENANT_SLUG=<slug> ile tek mağaza seçilir; boşsa tüm mağazalar. */
const targetTenants = await db.select({ id: tenants.id, slug: tenants.slug }).from(tenants).where(process.env.TENANT_SLUG ? eq(tenants.slug, process.env.TENANT_SLUG) : undefined);

for (const tenant of targetTenants) {
  const { created, existing } = await seedBlogPlan(tenant.id);
  console.log(`${tenant.slug}: ${created} taslak oluşturuldu, ${existing} zaten vardı.`);
}

await pool.end();

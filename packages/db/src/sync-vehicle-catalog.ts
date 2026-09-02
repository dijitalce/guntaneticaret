import { and, eq } from "drizzle-orm";
import { db, pg } from "./client";
import {
  brandGroupMembers,
  brandGroups,
  tenantSettings,
  tenants,
  vehicleBrands,
  vehicleModels,
} from "./schema";
import { compileVisibility } from "./compile-visibility";
import { VEHICLE_BRANDS, brandLogoUrl } from "./vehicle-catalog";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function upsertGroup(name: string, slug: string) {
  const existing = await db.select().from(brandGroups).where(eq(brandGroups.slug, slug)).limit(1);
  if (existing[0]) return existing[0];
  const [row] = await db.insert(brandGroups).values({ name, slug }).returning();
  return row!;
}

async function main() {
  const groupRows = {
    japan: await upsertGroup("Japon Grubu", "japon-grubu"),
    germany: await upsertGroup("Alman Grubu", "alman-grubu"),
    italy: await upsertGroup("İtalyan Grubu", "italyan-grubu"),
    france: await upsertGroup("Fransız Grubu", "fransiz-grubu"),
    korea: await upsertGroup("Kore Grubu", "kore-grubu"),
    usa: await upsertGroup("Amerikan Grubu", "amerikan-grubu"),
    uk: await upsertGroup("İngiliz Grubu", "ingiliz-grubu"),
    sweden: await upsertGroup("İsveç Grubu", "isvec-grubu"),
    other: await upsertGroup("Diğer Markalar", "diger-markalar"),
  };

  for (const [i, brand] of VEHICLE_BRANDS.entries()) {
    const logoUrl = brandLogoUrl(brand.slug);
    const found = await db.select().from(vehicleBrands).where(eq(vehicleBrands.slug, brand.slug)).limit(1);
    let brandId = found[0]?.id;
    if (brandId) {
      await db.update(vehicleBrands).set({ name: brand.name, logoUrl, sortOrder: i, isActive: true }).where(eq(vehicleBrands.id, brandId));
    } else {
      const [row] = await db
        .insert(vehicleBrands)
        .values({ name: brand.name, slug: brand.slug, logoUrl, sortOrder: i, isActive: true })
        .returning();
      brandId = row!.id;
    }

    const group = groupRows[brand.group];
    const linked = await db
      .select()
      .from(brandGroupMembers)
      .where(and(eq(brandGroupMembers.groupId, group.id), eq(brandGroupMembers.brandId, brandId)))
      .limit(1);
    if (linked.length === 0) {
      await db.insert(brandGroupMembers).values({ groupId: group.id, brandId });
    }

    for (const [mi, modelName] of brand.models.entries()) {
      const modelSlug = slugify(modelName);
      const existingModel = await db
        .select()
        .from(vehicleModels)
        .where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.slug, modelSlug)))
        .limit(1);
      if (existingModel[0]) {
        await db.update(vehicleModels).set({ name: modelName, sortOrder: mi, isActive: true }).where(eq(vehicleModels.id, existingModel[0].id));
      } else {
        await db.insert(vehicleModels).values({
          brandId,
          name: modelName,
          slug: modelSlug,
          sortOrder: mi,
          isActive: true,
        });
      }
    }
  }

  const [guntan] = await db.select().from(tenants).where(eq(tenants.slug, "guntan")).limit(1);
  if (guntan) {
    await db.update(tenantSettings).set({
      logoUrl: "/brand/logo.png",
      faviconUrl: "/favicon.png",
      ogImageUrl: "/brand/mark.png",
      placeholderImageUrl: "/placeholder-product.jpg",
    }).where(eq(tenantSettings.tenantId, guntan.id));
  }

  await compileVisibility(db);
  console.log(`Synced ${VEHICLE_BRANDS.length} brands with logos and models.`);
  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

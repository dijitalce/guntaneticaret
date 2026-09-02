import { createHash, randomBytes, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pg } from "./client";
import {
  adminUserRoles,
  adminUsers,
  brandGroupMembers,
  brandGroups,
  categories,
  manufacturers,
  menus,
  menuItems,
  pages,
  productCategories,
  productFitments,
  productOems,
  products,
  roles,
  suppliers,
  tenantBankAccounts,
  tenantCatalogRules,
  tenantDomains,
  tenantSettings,
  tenants,
  vehicleBrands,
  vehicleEngines,
  vehicleGenerations,
  vehicleModels,
  xmlFeeds,
} from "./schema";
import { compileVisibility } from "./compile-visibility";
import { ALL_CATALOG_URL, ALL_SITE, GROUP_SITES } from "./group-sites";
import { ADMIN_PERMISSION, ADMIN_ROLE, DEFAULT_THEME_TOKENS, ROLE_PERMISSIONS } from "@guntan/types";
import { permissions, rolePermissions } from "./schema/system";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

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

async function main() {
  const existing = await db.select({ id: tenants.id }).from(tenants).limit(1);
  if (existing.length > 0) {
    console.log("Seed skipped: data already present.");
    await pg.end();
    return;
  }

  const permRows = await db
    .insert(permissions)
    .values(Object.values(ADMIN_PERMISSION).map((key) => ({ key, name: key })))
    .returning();
  const permByKey = Object.fromEntries(permRows.map((p) => [p.key, p.id]));

  const roleRows = await db
    .insert(roles)
    .values(
      Object.entries(ADMIN_ROLE).map(([, key]) => ({
        key,
        name: key,
      })),
    )
    .returning();
  const roleByKey = Object.fromEntries(roleRows.map((r) => [r.key, r.id]));

  for (const [roleKey, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleByKey[roleKey];
    if (!roleId) continue;
    await db.insert(rolePermissions).values(
      perms.map((p) => ({
        roleId,
        permissionId: permByKey[p]!,
      })),
    );
  }

  const [admin] = await db
    .insert(adminUsers)
    .values({
      email: "admin@guntan.local",
      name: "Süper Admin",
      passwordHash: hashPassword("Admin123!"),
    })
    .returning();
  await db.insert(adminUserRoles).values({
    adminUserId: admin!.id,
    roleId: roleByKey[ADMIN_ROLE.SUPER_ADMIN]!,
  });

  const [supplier] = await db
    .insert(suppliers)
    .values({ name: "Demo Tedarikçi", code: "DEMO" })
    .returning();

  const [bosch] = await db
    .insert(manufacturers)
    .values({ name: "Bosch", slug: "bosch" })
    .returning();
  const [mann] = await db
    .insert(manufacturers)
    .values({ name: "MANN-FILTER", slug: "mann-filter" })
    .returning();

  const brandDefs = [
    { name: "Alfa Romeo", slug: "alfa-romeo", group: "italy" },
    { name: "BMW", slug: "bmw", group: "germany" },
    { name: "Honda", slug: "honda", group: "japan" },
    { name: "Toyota", slug: "toyota", group: "japan" },
  ] as const;

  const brandRows = await db
    .insert(vehicleBrands)
    .values(brandDefs.map((b, i) => ({ name: b.name, slug: b.slug, sortOrder: i, logoUrl: `/brands/${b.slug}.png` })))
    .returning();
  const brandBySlug = Object.fromEntries(brandRows.map((b) => [b.slug, b]));

  const [japanGroup] = await db
    .insert(brandGroups)
    .values({ name: "Japon Grubu", slug: "japon-grubu" })
    .returning();
  const [germanyGroup] = await db
    .insert(brandGroups)
    .values({ name: "Alman Grubu", slug: "alman-grubu" })
    .returning();
  const [italyGroup] = await db
    .insert(brandGroups)
    .values({ name: "İtalyan Grubu", slug: "italyan-grubu" })
    .returning();

  await db.insert(brandGroupMembers).values([
    { groupId: japanGroup!.id, brandId: brandBySlug["honda"]!.id },
    { groupId: japanGroup!.id, brandId: brandBySlug["toyota"]!.id },
    { groupId: germanyGroup!.id, brandId: brandBySlug["bmw"]!.id },
    { groupId: italyGroup!.id, brandId: brandBySlug["alfa-romeo"]!.id },
  ]);

  async function addModel(
    brandSlug: string,
    name: string,
    genName: string,
    yearFrom: number,
    yearTo: number,
    engineName: string,
  ) {
    const brand = brandBySlug[brandSlug]!;
    const [model] = await db
      .insert(vehicleModels)
      .values({ brandId: brand.id, name, slug: slugify(name) })
      .returning();
    const [gen] = await db
      .insert(vehicleGenerations)
      .values({
        modelId: model!.id,
        name: genName,
        slug: slugify(genName),
        yearFrom,
        yearTo,
      })
      .returning();
    const [engine] = await db
      .insert(vehicleEngines)
      .values({
        generationId: gen!.id,
        name: engineName,
        slug: slugify(engineName),
        fuel: "benzin",
      })
      .returning();
    return { brand, model: model!, gen: gen!, engine: engine! };
  }

  const alfa147 = await addModel("alfa-romeo", "147", "2000-2010", 2000, 2010, "1.6 Twin Spark");
  const alfa156 = await addModel("alfa-romeo", "156", "1997-2007", 1997, 2007, "1.6 Twin Spark");
  const bmw3 = await addModel("bmw", "3 Serisi", "E46", 1998, 2006, "320i");
  const civic = await addModel("honda", "Civic", "8. Nesil", 2006, 2011, "1.6");
  const corolla = await addModel("toyota", "Corolla", "E150", 2006, 2013, "1.6");

  const [fren] = await db
    .insert(categories)
    .values({ name: "Fren Sistemi", slug: "fren-sistemi", path: "fren-sistemi", sortOrder: 1 })
    .returning();
  const [motor] = await db
    .insert(categories)
    .values({ name: "Motor Parçaları", slug: "motor-parcalari", path: "motor-parcalari", sortOrder: 2 })
    .returning();
  const [yagFiltresi] = await db
    .insert(categories)
    .values({
      parentId: motor!.id,
      name: "Yağ Filtresi",
      slug: "yag-filtresi",
      path: "motor-parcalari/yag-filtresi",
      sortOrder: 1,
    })
    .returning();

  type P = {
    name: string;
    sku: string;
    price: string;
    compare?: string;
    stock: number;
    oem: string;
    mfr: string;
    cat: string;
    fit: Array<{ brandId: string; modelId: string; genId: string; engineId: string }>;
  };

  const productDefs: P[] = [
    {
      name: "Alfa Romeo 147 Yağ Filtresi",
      sku: "BOSCH-OF-147",
      price: "249.90",
      compare: "299.90",
      stock: 24,
      oem: "71736159",
      mfr: bosch!.id,
      cat: yagFiltresi!.id,
      fit: [{ brandId: alfa147.brand.id, modelId: alfa147.model.id, genId: alfa147.gen.id, engineId: alfa147.engine.id }],
    },
    {
      name: "Alfa Romeo 147 Ön Fren Balatası",
      sku: "BOSCH-BP-147",
      price: "1290.00",
      stock: 12,
      oem: "77362222",
      mfr: bosch!.id,
      cat: fren!.id,
      fit: [{ brandId: alfa147.brand.id, modelId: alfa147.model.id, genId: alfa147.gen.id, engineId: alfa147.engine.id }],
    },
    {
      name: "Alfa Romeo 156 Yağ Filtresi",
      sku: "MANN-OF-156",
      price: "219.00",
      stock: 8,
      oem: "60810747",
      mfr: mann!.id,
      cat: yagFiltresi!.id,
      fit: [{ brandId: alfa156.brand.id, modelId: alfa156.model.id, genId: alfa156.gen.id, engineId: alfa156.engine.id }],
    },
    {
      name: "BMW 3 Serisi E46 Yağ Filtresi",
      sku: "BOSCH-OF-E46",
      price: "389.00",
      stock: 15,
      oem: "11427512300",
      mfr: bosch!.id,
      cat: yagFiltresi!.id,
      fit: [{ brandId: bmw3.brand.id, modelId: bmw3.model.id, genId: bmw3.gen.id, engineId: bmw3.engine.id }],
    },
    {
      name: "Honda Civic 8 Yağ Filtresi",
      sku: "MANN-OF-CIVIC",
      price: "189.00",
      stock: 30,
      oem: "15400-PLM-A02",
      mfr: mann!.id,
      cat: yagFiltresi!.id,
      fit: [{ brandId: civic.brand.id, modelId: civic.model.id, genId: civic.gen.id, engineId: civic.engine.id }],
    },
    {
      name: "Honda Civic 8 Ön Fren Balatası",
      sku: "BOSCH-BP-CIVIC",
      price: "980.00",
      stock: 6,
      oem: "45022-SNA-E00",
      mfr: bosch!.id,
      cat: fren!.id,
      fit: [{ brandId: civic.brand.id, modelId: civic.model.id, genId: civic.gen.id, engineId: civic.engine.id }],
    },
    {
      name: "Toyota Corolla Yağ Filtresi",
      sku: "MANN-OF-COROLLA",
      price: "175.00",
      stock: 40,
      oem: "90915-YZZD2",
      mfr: mann!.id,
      cat: yagFiltresi!.id,
      fit: [{ brandId: corolla.brand.id, modelId: corolla.model.id, genId: corolla.gen.id, engineId: corolla.engine.id }],
    },
    {
      name: "Evrensel Yağ Filtresi (Alfa + Honda)",
      sku: "BOSCH-OF-UNI",
      price: "265.00",
      stock: 18,
      oem: "UNI-FILTER-01",
      mfr: bosch!.id,
      cat: yagFiltresi!.id,
      fit: [
        { brandId: alfa147.brand.id, modelId: alfa147.model.id, genId: alfa147.gen.id, engineId: alfa147.engine.id },
        { brandId: civic.brand.id, modelId: civic.model.id, genId: civic.gen.id, engineId: civic.engine.id },
      ],
    },
  ];

  for (const p of productDefs) {
    const slug = slugify(`${p.name}-${p.sku}`);
    const [product] = await db
      .insert(products)
      .values({
        supplierId: supplier!.id,
        manufacturerId: p.mfr,
        sku: p.sku,
        externalId: p.sku,
        name: p.name,
        slug,
        description: `${p.name} — KDV dahildir.`,
        price: p.price,
        compareAtPrice: p.compare ?? null,
        stockQty: p.stock,
        stockStatus: p.stock > 0 ? "in_stock" : "out_of_stock",
        status: "active",
        source: "manual",
        contentHash: createHash("sha256").update(JSON.stringify(p)).digest("hex"),
      })
      .returning();
    await db.insert(productOems).values({
      productId: product!.id,
      raw: p.oem,
      normalized: p.oem.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
    });
    await db.insert(productCategories).values({ productId: product!.id, categoryId: p.cat });
    for (const f of p.fit) {
      await db.insert(productFitments).values({
        productId: product!.id,
        vehicleBrandId: f.brandId,
        vehicleModelId: f.modelId,
        vehicleGenerationId: f.genId,
        vehicleEngineId: f.engineId,
      });
    }
  }

  const guntanTheme = { ...DEFAULT_THEME_TOKENS };
  const japonTheme = { ...DEFAULT_THEME_TOKENS, primary: "#0f766e", accent: "#0e7490" };

  const [guntan] = await db
    .insert(tenants)
    .values({ name: "Güntan Oto Yedek Parça", slug: "guntan", status: "active", visibilityMode: "ALL" })
    .returning();
  const [japon] = await db
    .insert(tenants)
    .values({ name: "Japon Grup Oto Yedek Parça", slug: "japon", status: "active", visibilityMode: "GROUPS" })
    .returning();

  const japonSite = GROUP_SITES.find((s) => s.slug === "japon")!;
  await db.insert(tenantDomains).values([
    { tenantId: guntan!.id, hostname: ALL_SITE.productionHost, isPrimary: true },
    ...ALL_SITE.localHosts.map((hostname) => ({ tenantId: guntan!.id, hostname, isPrimary: false })),
    { tenantId: japon!.id, hostname: japonSite.productionHost, isPrimary: true },
    ...japonSite.localHosts.map((hostname) => ({ tenantId: japon!.id, hostname, isPrimary: false })),
  ]);

  await db.insert(tenantSettings).values([
    {
      tenantId: guntan!.id,
      siteName: "Güntan Oto Yedek Parça",
      phone: "0216 000 00 00",
      whatsapp: "905550000000",
      email: "info@guntanotoyedekparca.com",
      address: "İstanbul",
      themeTokens: guntanTheme,
      defaultMetaTitle: "Güntan Oto Yedek Parça",
      defaultMetaDescription: "Tüm markalar için oto yedek parça.",
      seoContent: "Güntan Oto Yedek Parça, tüm araç markaları için yedek parça sunar.",
      logoUrl: "/brand/logo.png",
      faviconUrl: "/favicon.png",
      placeholderImageUrl: "/placeholder-product.jpg",
      ogImageUrl: "/brand/mark.png",
    },
    {
      tenantId: japon!.id,
      siteName: "Japon Grup Oto Yedek Parça",
      phone: "0216 000 00 01",
      whatsapp: "905550000001",
      email: japonSite.email,
      address: "İstanbul",
      themeTokens: japonTheme,
      defaultMetaTitle: "Japon Grup Oto Yedek Parça",
      defaultMetaDescription: "Japon markaları için yedek parça.",
      seoContent: "Honda, Toyota ve diğer Japon markaları için yedek parça.",
      placeholderImageUrl: "/placeholder-product.jpg",
      socialJson: { allCatalogUrl: ALL_CATALOG_URL },
    },
  ]);

  await db.insert(tenantCatalogRules).values({
    tenantId: japon!.id,
    kind: "include_group",
    targetId: japanGroup!.id,
  });

  await db.insert(tenantBankAccounts).values([
    {
      tenantId: guntan!.id,
      bankName: "Ziraat Bankası",
      accountHolder: "Güntan Oto Yedek Parça",
      iban: "TR00 0000 0000 0000 0000 0000 01",
    },
    {
      tenantId: japon!.id,
      bankName: "Ziraat Bankası",
      accountHolder: "Japon Grup Oto Yedek Parça",
      iban: "TR00 0000 0000 0000 0000 0000 02",
    },
  ]);

  for (const tenant of [guntan!, japon!]) {
    await db.insert(pages).values([
      { tenantId: tenant.id, title: "Hakkımızda", slug: "hakkimizda", body: "Hakkımızda içeriği." },
      { tenantId: tenant.id, title: "Mesafeli Satış Sözleşmesi", slug: "mesafeli-satis", body: "Sözleşme metni." },
      { tenantId: tenant.id, title: "Gizlilik", slug: "gizlilik", body: "KVKK ve gizlilik." },
      { tenantId: tenant.id, title: "İade Şartları", slug: "iade", body: "İade koşulları." },
    ]);
    const [menu] = await db.insert(menus).values({ tenantId: tenant.id, key: "header", name: "Header" }).returning();
    await db.insert(menuItems).values([
      { menuId: menu!.id, label: "Ana Sayfa", href: "/", sortOrder: 0 },
      { menuId: menu!.id, label: "İletişim", href: "/iletisim", sortOrder: 1 },
    ]);
  }

  await db.insert(xmlFeeds).values({
    supplierId: supplier!.id,
    name: "Demo Fixture Feed",
    filePath: "packages/import/fixtures/demo-products.xml",
    mapping: {
      externalId: "id",
      sku: "sku",
      name: "name",
      description: "description",
      manufacturer: "manufacturer",
      category: "category",
      price: "price",
      compareAtPrice: "compareAtPrice",
      stock: "stock",
      barcode: "barcode",
      oem: "oem",
      imageUrl: "image",
      vehicleBrand: "fitment.brand",
      vehicleModel: "fitment.model",
      vehicleGeneration: "fitment.generation",
      vehicleEngine: "fitment.engine",
    },
  });

  await compileVisibility(db);
  console.log("Seed complete. Admin: admin@guntan.local / Admin123!");
  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  brandGroups,
  db,
  tenantBankAccounts,
  tenantCatalogRules,
  tenantDomains,
  tenantSettings,
  tenants,
  vehicleBrands,
} from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function TenantEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();
  const [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, id)).limit(1);
  const domains = await db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, id));
  const rules = await db.select().from(tenantCatalogRules).where(eq(tenantCatalogRules.tenantId, id));
  const groups = await db.select().from(brandGroups);
  const brands = await db.select().from(vehicleBrands);
  const banks = await db.select().from(tenantBankAccounts).where(eq(tenantBankAccounts.tenantId, id));
  const theme = (settings?.themeTokens ?? {}) as Record<string, string>;

  return (
    <AdminShell>
      <h1>{tenant.name}</h1>
      <form action={`/api/tenants/${tenant.id}`} method="post" className="wizard">
        <input className="input" name="name" defaultValue={tenant.name} />
        <select className="select" name="status" defaultValue={tenant.status}>
          <option value="draft">draft</option>
          <option value="active">active</option>
          <option value="maintenance">maintenance</option>
        </select>
        <select className="select" name="visibilityMode" defaultValue={tenant.visibilityMode}>
          <option value="ALL">ALL</option>
          <option value="GROUPS">GROUPS</option>
          <option value="BRANDS">BRANDS</option>
          <option value="CUSTOM">CUSTOM</option>
        </select>
        <label>Primary <input name="primary" type="color" defaultValue={theme.primary ?? "#b42318"} /></label>
        <label>Logo URL <input className="input" name="logoUrl" defaultValue={settings?.logoUrl ?? ""} /></label>
        <label>Telefon <input className="input" name="phone" defaultValue={settings?.phone ?? ""} /></label>
        <h2>Gruplar (include)</h2>
        {groups.map((g) => (
          <label key={g.id}>
            <input type="checkbox" name="groupIds" value={g.id} defaultChecked={rules.some((r) => r.targetId === g.id && r.kind === "include_group")} /> {g.name}
          </label>
        ))}
        <h2>Marka hariç tut</h2>
        {brands.map((b) => (
          <label key={b.id}>
            <input type="checkbox" name="excludeBrandIds" value={b.id} defaultChecked={rules.some((r) => r.targetId === b.id && r.kind === "exclude_brand")} /> {b.name}
          </label>
        ))}
        <button className="btn btn-primary">Kaydet ve derle</button>
      </form>
      <h2>Domainler</h2>
      <ul>{domains.map((d) => <li key={d.id}>{d.hostname} {d.isPrimary ? "(primary)" : ""}</li>)}</ul>
      <h2>Banka</h2>
      {banks.map((b) => <p key={b.id}>{b.bankName} {b.iban}</p>)}
    </AdminShell>
  );
}

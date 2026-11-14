/**
 * Bütün sitelerin havale hesabını BANK_ACCOUNT ile eşitler.
 * Hesabı olmayan siteye ekler, yer tutucu (TR00 0000 …) hesabı günceller;
 * panelden girilmiş başka gerçek hesaplara dokunmaz, yalnızca bildirir.
 * Varsayılan olarak yalnızca ne değişeceğini yazar; yazmak için `--apply` verin.
 */
import { asc, eq } from "drizzle-orm";
import { db, pool } from "./client";
import { tenantBankAccounts, tenants } from "./schema";
import { BANK_ACCOUNT, isPlaceholderIban } from "./content/bank-account";

const compact = (iban: string) => iban.replace(/\s+/g, "").toUpperCase();

async function main() {
  const apply = process.argv.includes("--apply");
  const sites = await db.select({ id: tenants.id, slug: tenants.slug }).from(tenants).orderBy(asc(tenants.slug));

  let changed = 0;
  for (const site of sites) {
    const accounts = await db
      .select()
      .from(tenantBankAccounts)
      .where(eq(tenantBankAccounts.tenantId, site.id))
      .orderBy(asc(tenantBankAccounts.sortOrder));
    const current = accounts.find((a) => compact(a.iban) === compact(BANK_ACCOUNT.iban));
    const placeholders = accounts.filter((a) => isPlaceholderIban(a.iban));
    const others = accounts.filter((a) => a !== current && !placeholders.includes(a));
    const upToDate =
      current &&
      current.isActive &&
      current.iban === BANK_ACCOUNT.iban &&
      current.accountHolder === BANK_ACCOUNT.accountHolder &&
      current.bankName === BANK_ACCOUNT.bankName;

    const steps: string[] = [];
    if (current && !upToDate) steps.push("hesap bilgisi düzeltilecek");
    if (!current) steps.push(placeholders.length ? "yer tutucu hesap güncellenecek" : "hesap eklenecek");
    const extra = current ? placeholders : placeholders.slice(1);
    if (extra.length) steps.push(`${extra.length} yer tutucu silinecek`);
    if (others.length) steps.push(`DİKKAT: ${others.length} başka hesap var (${others.map((o) => o.iban).join(", ")}), dokunulmadı`);
    console.log(`${site.slug.padEnd(10)} ${steps.length ? steps.join("; ") : "güncel"}`);

    if (!steps.length || (upToDate && !extra.length)) continue;
    changed++;
    if (!apply) continue;
    const values = { ...BANK_ACCOUNT, isActive: true };
    if (current) await db.update(tenantBankAccounts).set(values).where(eq(tenantBankAccounts.id, current.id));
    else if (placeholders[0]) await db.update(tenantBankAccounts).set(values).where(eq(tenantBankAccounts.id, placeholders[0].id));
    else await db.insert(tenantBankAccounts).values({ tenantId: site.id, ...values, sortOrder: accounts.length });
    for (const p of extra) await db.delete(tenantBankAccounts).where(eq(tenantBankAccounts.id, p.id));
  }
  console.log(apply ? `${changed} site güncellendi.` : `${changed} site güncellenecek. Yazmak için: pnpm db:seed-bank-account --apply`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

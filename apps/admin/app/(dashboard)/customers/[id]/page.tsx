import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import {
  auditLogs,
  cartItems,
  carts,
  customerAddresses,
  customerVehicles,
  customers,
  db,
  ensureExtTables,
  getCustomerMeta,
  orders,
  products,
  tenants,
  vehicleBrands,
  vehicleModels,
  wishlists,
} from "@guntan/db";
import { orderStatusLabel } from "@guntan/ecommerce";
import { AuditTable } from "@/src/audit-table";
import { ConfirmButton } from "@/src/form-fields";
import { IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate, formatTry, statusTone } from "@/src/ui";
import { StatRow, relativeTime } from "@/src/ui-ext";

export const metadata = { title: "Müşteri" };
export const dynamic = "force-dynamic";

const OK: Record<string, string> = {
  kaydedildi: "Müşteri bilgileri kaydedildi.",
  etiket: "Etiketler ve not kaydedildi.",
  sifre: "Müşteri şifresi güncellendi ve açık oturumları kapatıldı.",
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await ensureExtTables();
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) notFound();

  const [meta, orderRows, addresses, vehicles, cartRows, wishCount, history] = await Promise.all([
    getCustomerMeta(id),
    db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
        tenantName: tenants.name,
      })
      .from(orders)
      .leftJoin(tenants, eq(tenants.id, orders.tenantId))
      .where(sql`${orders.customerId} = ${id} or ${orders.email} = ${customer.email}`)
      .orderBy(desc(orders.createdAt))
      .limit(100),
    db.select().from(customerAddresses).where(eq(customerAddresses.customerId, id)),
    db
      .select({ id: customerVehicles.id, year: customerVehicles.year, label: customerVehicles.label, brand: vehicleBrands.name, model: vehicleModels.name })
      .from(customerVehicles)
      .leftJoin(vehicleBrands, eq(vehicleBrands.id, customerVehicles.brandId))
      .leftJoin(vehicleModels, eq(vehicleModels.id, customerVehicles.modelId))
      .where(eq(customerVehicles.customerId, id)),
    db
      .select({ cartId: carts.id, updatedAt: carts.updatedAt, qty: cartItems.qty, name: products.name, sku: products.sku, price: products.price })
      .from(carts)
      .innerJoin(cartItems, eq(cartItems.cartId, carts.id))
      .innerJoin(products, eq(products.id, cartItems.productId))
      .where(eq(carts.customerId, id))
      .orderBy(desc(carts.updatedAt))
      .limit(30),
    db.select({ c: sql<number>`count(*)` }).from(wishlists).where(eq(wishlists.customerId, id)),
    db.select().from(auditLogs).where(sql`${auditLogs.entity} = 'customer' and ${auditLogs.entityId} = ${id}`).orderBy(desc(auditLogs.createdAt)).limit(15),
  ]);

  const valid = orderRows.filter((o) => !["cancelled", "refunded", "failed", "expired"].includes(o.status));
  const spent = valid.reduce((s, o) => s + Number(o.grandTotal), 0);
  const cartTotal = cartRows.reduce((s, r) => s + Number(r.price) * r.qty, 0);
  const tenantCount = new Set(orderRows.map((o) => o.tenantName)).size;
  const action = withBase(`/api/customers/${id}`);

  return (
    <>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        description={`${customer.email}${customer.phone ? ` · ${customer.phone}` : ""} · Kayıt: ${formatDate(customer.createdAt, false)}`}
        crumbs={[{ href: "/customers", label: "Müşteriler" }]}
        actions={
          <>
            {customer.invoiceType === "corporate" ? <StatusBadge tone="info">Kurumsal</StatusBadge> : <StatusBadge>Bireysel</StatusBadge>}
            {meta.is_blocked ? <StatusBadge tone="bad">Engelli</StatusBadge> : null}
          </>
        }
      />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {meta.is_blocked ? <Alert tone="warn">Bu müşteri engelli: giriş yapamaz ve yeni sipariş veremez.</Alert> : null}

      <Panel padded>
        <StatRow
          items={[
            { label: "Sipariş", value: valid.length, hint: orderRows.length > valid.length ? `${orderRows.length - valid.length} iptal/başarısız` : undefined },
            { label: "Toplam harcama", value: formatTry(spent) },
            { label: "Ortalama sepet", value: valid.length ? formatTry(spent / valid.length) : "—" },
            { label: "Son sipariş", value: orderRows[0] ? relativeTime(orderRows[0].createdAt) : "—" },
            { label: "Açık sepet", value: cartRows.length ? formatTry(cartTotal) : "—", hint: cartRows.length ? `${cartRows.length} ürün` : undefined },
            { label: "Favori", value: Number(wishCount[0]?.c ?? 0) },
          ]}
        />
      </Panel>

      <div className="grid-2">
        <div>
          <Panel title="Siparişler" description={tenantCount > 1 ? `${tenantCount} farklı sitede` : undefined}>
            {orderRows.length === 0 ? (
              <EmptyState title="Henüz sipariş yok" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      <th>Site</th>
                      <th>Durum</th>
                      <th>Tutar</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderRows.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link className="mono" href={`/orders/${o.id}`}>
                            {o.orderNo}
                          </Link>
                        </td>
                        <td className="text-sm">{o.tenantName ?? "—"}</td>
                        <td>
                          <StatusBadge tone={statusTone(o.status)}>{orderStatusLabel(o.status)}</StatusBadge>
                        </td>
                        <td>{formatTry(o.grandTotal)}</td>
                        <td className="text-sm muted">{formatDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Sepetindeki ürünler" description={cartRows[0] ? `Son güncelleme ${relativeTime(cartRows[0].updatedAt)}` : undefined}>
            {cartRows.length === 0 ? (
              <EmptyState title="Sepet boş" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Adet</th>
                      <th>Fiyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartRows.map((r, i) => (
                      <tr key={`${r.cartId}-${i}`}>
                        <td>
                          {r.name}
                          <div className="muted mono text-sm">{r.sku}</div>
                        </td>
                        <td>{r.qty}</td>
                        <td>{formatTry(Number(r.price) * r.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Adresler">
            {addresses.length === 0 ? (
              <EmptyState title="Kayıtlı adres yok" />
            ) : (
              <div className="address-grid panel-pad">
                {addresses.map((a) => (
                  <div key={a.id} className="address-card">
                    <strong>
                      {a.title} {a.isDefault ? <StatusBadge tone="ok">Varsayılan</StatusBadge> : null}{" "}
                      {a.kind === "billing" ? <StatusBadge tone="info">Fatura</StatusBadge> : null}
                    </strong>
                    <span>{a.fullName}</span>
                    <span>{a.line1}</span>
                    {a.line2 ? <span>{a.line2}</span> : null}
                    <span>
                      {a.district} / {a.city} {a.postalCode ?? ""}
                    </span>
                    <span className="muted">{a.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Araçları">
            {vehicles.length === 0 ? (
              <EmptyState title="Kayıtlı araç yok" />
            ) : (
              <ul className="link-list">
                {vehicles.map((v) => (
                  <li key={v.id}>
                    <span>
                      <strong>
                        {v.brand ?? "?"} {v.model ?? ""}
                      </strong>{" "}
                      {v.year ? <span className="muted">{v.year}</span> : null}
                    </span>
                    {v.label ? <span className="muted text-sm">{v.label}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {history.length ? (
            <Panel title="Değişiklik geçmişi">
              <AuditTable rows={history} />
            </Panel>
          ) : null}
        </div>

        <div>
          <Panel title="Etiketler ve not" padded>
            <form action={action} method="post" className="form-stack">
              <input type="hidden" name="_action" value="meta" />
              <div className="field">
                <label htmlFor="c-tags">Etiketler</label>
                <input id="c-tags" className="input" name="tags" defaultValue={meta.tags.join(", ")} placeholder="VIP, toptan, servis" />
                <small className="field-hint">Virgülle ayırın. Segmentlerde ve listelerde kullanılır.</small>
              </div>
              <div className="field">
                <label htmlFor="c-note">İç not</label>
                <textarea id="c-note" className="input" name="note" rows={3} defaultValue={meta.note ?? ""} placeholder="Yalnızca panelde görünür" />
              </div>
              <label className="check">
                <input type="checkbox" name="blocked" value="1" defaultChecked={meta.is_blocked} /> Müşteriyi engelle (giriş ve sipariş engellenir)
              </label>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  Kaydet
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Müşteri bilgileri" padded>
            <form action={action} method="post" className="form-stack">
              <input type="hidden" name="_action" value="save" />
              <div className="form-row">
                <div className="field">
                  <label htmlFor="c-fn">Ad</label>
                  <input id="c-fn" className="input" name="firstName" required defaultValue={customer.firstName} />
                </div>
                <div className="field">
                  <label htmlFor="c-ln">Soyad</label>
                  <input id="c-ln" className="input" name="lastName" required defaultValue={customer.lastName} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="c-em">E-posta</label>
                <input id="c-em" className="input" type="email" name="email" required defaultValue={customer.email} />
              </div>
              <div className="field">
                <label htmlFor="c-ph">Telefon</label>
                <input id="c-ph" className="input" name="phone" defaultValue={customer.phone ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="c-it">Fatura tipi</label>
                <select id="c-it" className="input" name="invoiceType" defaultValue={customer.invoiceType}>
                  <option value="individual">Bireysel</option>
                  <option value="corporate">Kurumsal</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-cn">Firma adı</label>
                <input id="c-cn" className="input" name="companyName" defaultValue={customer.companyName ?? ""} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="c-to">Vergi dairesi</label>
                  <input id="c-to" className="input" name="taxOffice" defaultValue={customer.taxOffice ?? ""} />
                </div>
                <div className="field">
                  <label htmlFor="c-tn">Vergi no</label>
                  <input id="c-tn" className="input" name="taxNumber" defaultValue={customer.taxNumber ?? ""} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="c-ni">TC kimlik no</label>
                <input id="c-ni" className="input" name="nationalId" defaultValue={customer.nationalId ?? ""} />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  Bilgileri kaydet
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Şifre belirle" padded>
            <form action={action} method="post" className="form-stack">
              <input type="hidden" name="_action" value="password" />
              <div className="field">
                <label htmlFor="c-pw">Yeni şifre</label>
                <input id="c-pw" className="input" type="password" name="password" minLength={8} required autoComplete="new-password" />
                <small className="field-hint">Müşteri şifresini unuttuğunda kullanın; açık oturumları kapatılır.</small>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" type="submit">
                  Şifreyi güncelle
                </button>
              </div>
            </form>
          </Panel>

          <Panel padded>
            <form action={action} method="post" className="danger-zone">
              <input type="hidden" name="_action" value="delete" />
              <div>
                <strong>Müşteriyi sil</strong>
                <small>
                  {orderRows.length
                    ? "Siparişi olduğu için hesap anonimleştirilir (KVKK); sipariş kayıtları korunur."
                    : "Hesap, adresler, araçlar ve sepet kalıcı olarak silinir."}
                </small>
              </div>
              <ConfirmButton className="btn btn-danger btn-sm" message="Müşteri silinsin mi? Bu işlem geri alınamaz.">
                <IconTrash />
                Sil
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}

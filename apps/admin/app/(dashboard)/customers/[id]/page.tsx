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
import { Alert, PageHeader, Panel, StatusBadge, formatDate, formatTry, statusTone } from "@/src/ui";
import { StatRow, initials, relativeTime } from "@/src/ui-ext";

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
            { label: "Toplam harcama", value: valid.length ? formatTry(spent) : "—" },
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
              <p className="panel-empty">Henüz sipariş yok.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      {tenantCount > 1 ? <th>Site</th> : null}
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
                        {tenantCount > 1 ? <td className="text-sm">{o.tenantName ?? "—"}</td> : null}
                        <td>
                          <StatusBadge tone={statusTone(o.status)}>{orderStatusLabel(o.status)}</StatusBadge>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{formatTry(o.grandTotal)}</td>
                        <td className="text-sm muted" style={{ whiteSpace: "nowrap" }}>
                          {formatDate(o.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Sepetindeki ürünler" description={cartRows[0] ? `Son güncelleme ${relativeTime(cartRows[0].updatedAt)}` : undefined}>
            {cartRows.length === 0 ? (
              <p className="panel-empty">Sepet boş.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Adet</th>
                      <th>Tutar</th>
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
                        <td style={{ whiteSpace: "nowrap" }}>{formatTry(Number(r.price) * r.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Adresler">
            {addresses.length === 0 ? (
              <p className="panel-empty">Kayıtlı adres yok.</p>
            ) : (
              <div className="address-grid panel-pad">
                {addresses.map((a) => (
                  <div key={a.id} className="address-card">
                    <strong>
                      {a.title}
                      {a.isDefault ? <StatusBadge tone="ok">Varsayılan</StatusBadge> : null}
                      {a.kind === "billing" ? <StatusBadge tone="info">Fatura</StatusBadge> : null}
                    </strong>
                    <span>{a.fullName}</span>
                    <span>{a.line1}</span>
                    {a.line2 ? <span>{a.line2}</span> : null}
                    <span>
                      {a.district} / {a.city} {a.postalCode ?? ""}
                    </span>
                    {a.phone ? <span className="muted">{a.phone}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Araçlar">
            {vehicles.length === 0 ? (
              <p className="panel-empty">Kayıtlı araç yok.</p>
            ) : (
              <ul className="link-list panel-pad" style={{ listStyle: "none", margin: 0 }}>
                {vehicles.map((v) => (
                  <li key={v.id}>
                    <strong>
                      {v.brand ?? "?"} {v.model ?? ""}
                    </strong>{" "}
                    {v.year ? <span className="muted">{v.year}</span> : null}
                    {v.label ? <span className="muted text-sm"> · {v.label}</span> : null}
                  </li>
                ))}
              </ul>
            )}
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
              <div className="form-row">
                <div className="field">
                  <label htmlFor="c-em">E-posta</label>
                  <input id="c-em" className="input" type="email" name="email" required defaultValue={customer.email} />
                </div>
                <div className="field">
                  <label htmlFor="c-ph">Telefon</label>
                  <input id="c-ph" className="input" type="tel" name="phone" defaultValue={customer.phone ?? ""} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="c-it">Fatura tipi</label>
                  <select id="c-it" className="select" name="invoiceType" defaultValue={customer.invoiceType}>
                    <option value="individual">Bireysel</option>
                    <option value="corporate">Kurumsal</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="c-ni">TC kimlik no</label>
                  <input id="c-ni" className="input mono" name="nationalId" inputMode="numeric" maxLength={11} defaultValue={customer.nationalId ?? ""} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="c-cn">Firma adı</label>
                <input id="c-cn" className="input" name="companyName" defaultValue={customer.companyName ?? ""} />
                <small className="field-hint">Kurumsal fatura için firma adı, vergi dairesi ve vergi numarası gerekir.</small>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="c-to">Vergi dairesi</label>
                  <input id="c-to" className="input" name="taxOffice" defaultValue={customer.taxOffice ?? ""} />
                </div>
                <div className="field">
                  <label htmlFor="c-tn">Vergi no</label>
                  <input id="c-tn" className="input mono" name="taxNumber" inputMode="numeric" maxLength={11} defaultValue={customer.taxNumber ?? ""} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  Bilgileri kaydet
                </button>
              </div>
            </form>
          </Panel>

          {history.length ? (
            <Panel title="Değişiklik geçmişi">
              <AuditTable rows={history} />
            </Panel>
          ) : null}
        </div>

        <div>
          <Panel title="Müşteri" padded>
            <div className="customer-box" style={{ marginBottom: "1rem" }}>
              <span className="customer-avatar" aria-hidden>
                {initials(`${customer.firstName} ${customer.lastName}`)}
              </span>
              <div>
                <strong>
                  {customer.firstName} {customer.lastName}
                </strong>
                <span className="muted text-sm">{valid.length ? `${valid.length} sipariş · ${formatTry(spent)}` : "Henüz siparişi yok"}</span>
              </div>
            </div>
            <dl className="dl">
              <div>
                <dt>E-posta</dt>
                <dd>
                  <a href={`mailto:${customer.email}`}>{customer.email}</a>
                </dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{customer.phone ? <a href={`tel:${customer.phone.replace(/\s+/g, "")}`}>{customer.phone}</a> : "—"}</dd>
              </div>
              <div>
                <dt>Fatura</dt>
                <dd>
                  {customer.invoiceType === "corporate"
                    ? [customer.companyName, [customer.taxOffice, customer.taxNumber].filter(Boolean).join(" · ")].filter(Boolean).join(" — ") || "Kurumsal"
                    : customer.nationalId
                      ? `Bireysel · TC ${customer.nationalId}`
                      : "Bireysel"}
                </dd>
              </div>
              <div>
                <dt>Kayıt tarihi</dt>
                <dd>{formatDate(customer.createdAt)}</dd>
              </div>
              {meta.tags.length ? (
                <div>
                  <dt>Etiketler</dt>
                  <dd className="tag-list" style={{ marginTop: 0 }}>
                    {meta.tags.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Panel>

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

          <form action={action} method="post" className="danger-zone" style={{ marginTop: 0 }}>
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
        </div>
      </div>
    </>
  );
}

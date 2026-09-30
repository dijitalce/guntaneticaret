import { inArray } from "drizzle-orm";
import { db, escapeHtml, getShippingSettings, orderItems, orders, shipments, tenants } from "@guntan/db";
import { code128Svg } from "./code128";

const SIZES = {
  "100x150": { page: "100mm 150mm", width: "100mm", height: "150mm" },
  "100x100": { page: "100mm 100mm", width: "100mm", height: "100mm" },
  a4: { page: "A4", width: "190mm", height: "130mm" },
} as const;

export async function renderShippingLabels(orderIds: string[]) {
  const settings = await getShippingSettings();
  const ids = [...new Set(orderIds)].slice(0, 100);
  if (!ids.length) return null;
  const [orderRows, itemRows, shipmentRows] = await Promise.all([
    db.select().from(orders).where(inArray(orders.id, ids)),
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
    db.select().from(shipments).where(inArray(shipments.orderId, ids)),
  ]);
  if (!orderRows.length) return null;
  const tenantIds = [...new Set(orderRows.map((o) => o.tenantId))];
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).where(inArray(tenants.id, tenantIds));
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));
  const size = SIZES[settings.labelSize] ?? SIZES["100x150"];
  const esc = (v: unknown) => escapeHtml(String(v ?? ""));
  const sorted = ids.map((id) => orderRows.find((o) => o.id === id)).filter((o): o is (typeof orderRows)[number] => Boolean(o));

  const labels = sorted.map((o) => {
    const a = o.shippingAddress ?? {};
    const shipment = shipmentRows.find((s) => s.orderId === o.id);
    const items = itemRows.filter((i) => i.orderId === o.id);
    const pieces = items.reduce((s, i) => s + i.qty, 0);
    const recipient = a.shipFullName || o.fullName;
    const phone = a.shipPhone || o.phone;
    const address = [a.line1, a.line2].filter(Boolean).join(" ");
    const cityLine = [a.district, a.city].filter(Boolean).join(" / ");
    const sender = settings.senderName || tenantName.get(o.tenantId) || "";
    const senderAddress = [settings.senderAddress, [settings.senderDistrict, settings.senderCity].filter(Boolean).join(" / ")].filter(Boolean).join(", ");
    const barcodeValue = shipment?.trackingNo || o.orderNo;
    return `<section class="label">
  <header>
    <div><small>GÖNDERİCİ</small><strong>${esc(sender)}</strong>${senderAddress ? `<span>${esc(senderAddress)}</span>` : ""}${settings.senderPhone ? `<span>${esc(settings.senderPhone)}</span>` : ""}</div>
    <div class="carrier">${esc(shipment?.carrier || (settings.defaultCarrier === "aras" ? "Aras Kargo" : "Kargo"))}</div>
  </header>
  <div class="to">
    <small>ALICI</small>
    <strong class="name">${esc(recipient)}</strong>
    <span>${esc(address)}</span>
    <strong class="city">${esc(cityLine)}${a.postalCode ? ` ${esc(a.postalCode)}` : ""}</strong>
    <span>Tel: ${esc(phone)}</span>
  </div>
  <div class="barcode">${code128Svg(barcodeValue, { height: 56 })}<div class="code">${esc(barcodeValue)}</div></div>
  <div class="meta">
    <span>Sipariş: <b>${esc(o.orderNo)}</b></span>
    <span>Adet: <b>${pieces}</b></span>
    <span>${new Date(o.createdAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</span>
    ${settings.labelShowPrice ? `<span>Tutar: <b>${Number(o.grandTotal).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</b></span>` : ""}
  </div>
  ${
    settings.labelShowItems && items.length
      ? `<ul class="items">${items
          .slice(0, 8)
          .map((i) => `<li><b>${i.qty}×</b> ${esc(i.sku)} · ${esc(i.name.slice(0, 60))}</li>`)
          .join("")}${items.length > 8 ? `<li>+${items.length - 8} kalem daha</li>` : ""}</ul>`
      : ""
  }
  ${settings.labelNote ? `<footer>${esc(settings.labelNote)}</footer>` : ""}
</section>`;
  });

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Kargo etiketi</title>
<style>
@page { size: ${size.page}; margin: ${settings.labelSize === "a4" ? "10mm" : "0"}; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #eee; }
.toolbar { position: sticky; top: 0; display: flex; gap: 8px; align-items: center; padding: 10px 14px; background: #111; color: #fff; font-size: 14px; }
.toolbar button { font: inherit; padding: 6px 14px; border: 0; border-radius: 6px; background: #fff; color: #111; cursor: pointer; }
.sheet { display: flex; flex-wrap: wrap; gap: 12px; padding: 16px; justify-content: center; }
.label { width: ${size.width}; height: ${size.height}; background: #fff; border: 1px solid #000; padding: 4mm; display: flex; flex-direction: column; gap: 2.5mm; overflow: hidden; page-break-after: always; break-after: page; }
.label small { display: block; font-size: 7pt; letter-spacing: .08em; color: #333; }
header { display: flex; justify-content: space-between; gap: 3mm; border-bottom: 1.5px solid #000; padding-bottom: 2mm; font-size: 8pt; }
header span { display: block; }
.carrier { font-size: 13pt; font-weight: 700; text-align: right; }
.to { display: flex; flex-direction: column; gap: 1mm; font-size: 10pt; }
.to .name { font-size: 14pt; }
.to .city { font-size: 13pt; text-transform: uppercase; }
.barcode { text-align: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2mm 0; }
.barcode .code { font-family: monospace; font-size: 11pt; letter-spacing: .12em; margin-top: 1mm; }
.meta { display: flex; flex-wrap: wrap; gap: 2mm 4mm; font-size: 8.5pt; }
.items { margin: 0; padding: 0; list-style: none; font-size: 7.5pt; line-height: 1.35; }
footer { margin-top: auto; font-size: 7.5pt; border-top: 1px solid #000; padding-top: 1.5mm; }
@media print { body { background: #fff; } .toolbar { display: none; } .sheet { padding: 0; gap: 0; display: block; } .label { border: 0; margin: 0 auto; } }
</style></head>
<body>
<div class="toolbar"><strong>${labels.length} etiket</strong><span style="opacity:.7">Boyut: ${esc(settings.labelSize)} · Ayarlar &gt; Kargo bölümünden değiştirilebilir</span><button onclick="window.print()" style="margin-left:auto">Yazdır</button></div>
<div class="sheet">${labels.join("\n")}</div>
<script>setTimeout(function(){ if (!location.hash.includes("no-print")) window.print(); }, 400);</script>
</body></html>`;
}


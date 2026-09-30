import { and, count, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, getFeedProbe, getFeedSecret, products, suppliers, xmlFeeds, xmlImportRuns } from "@guntan/db";
import {
  CUSTOM_FIELD_LABELS,
  customFeedPath,
  feedConfigFromRow,
  isCustomFeed,
  mapCustomItem,
  maskFeedUrl,
  resolveFxRates,
  useStoredPriceTiers,
} from "@guntan/import";
import { PRODUCT_STATUS } from "@guntan/types";
import { mappingIsComplete } from "@/src/feed-source";
import { FeedConnectionFields } from "@/src/feed-source-form";
import { ConfirmButton } from "@/src/form-fields";
import { IconRefresh, IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { feedFileInfo, readServerSync } from "@/src/server-sync";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate, formatTry } from "@/src/ui";
import { relativeTime } from "@/src/ui-ext";

export const metadata = { title: "XML kaynağı" };
export const dynamic = "force-dynamic";

const OK_TEXT: Record<string, string> = {
  baglandi: "Bağlantı başarılı. Alanlar algılandı; eşleştirmeyi kontrol edip kaydedin.",
  kaydedildi: "Ayarlar kaydedildi.",
  aktif: "Kaynak aktif edildi. Bir sonraki senkronda ürünler çekilecek.",
  pasif: "Kaynak pasife alındı; senkrona dahil edilmeyecek.",
  basladi: "Kaynak sunucuda indiriliyor ve içe aktarılıyor. İlerlemeyi XML senkron sayfasındaki logdan izleyebilirsiniz.",
};

export default async function XmlSourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [feed] = await db.select().from(xmlFeeds).where(eq(xmlFeeds.id, id)).limit(1);
  if (!feed || !isCustomFeed(feed.mapping)) notFound();
  const cfg = feedConfigFromRow(feed.url, feed.mapping);
  const [secret, probe, [supplier], [productCount], runs] = await Promise.all([
    getFeedSecret(id),
    getFeedProbe(id),
    db.select().from(suppliers).where(eq(suppliers.id, feed.supplierId)).limit(1),
    db
      .select({ c: count() })
      .from(products)
      .where(and(eq(products.supplierId, feed.supplierId), eq(products.status, PRODUCT_STATUS.ACTIVE))),
    db.select().from(xmlImportRuns).where(eq(xmlImportRuns.feedId, id)).orderBy(desc(xmlImportRuns.createdAt)).limit(10),
  ]);
  const fields = probe.fields ?? [];
  const complete = mappingIsComplete(cfg);
  const file = feedFileInfo(customFeedPath(id));
  const server = readServerSync();

  let preview: { raw: Record<string, string>; row: ReturnType<typeof mapCustomItem> }[] = [];
  let fxNote = "";
  if (probe.ok && probe.items?.length && complete) {
    await useStoredPriceTiers();
    const fx = cfg.currency === "TRY" ? { EUR: 0, USD: 0, source: "" } : await resolveFxRates();
    if (cfg.currency !== "TRY") fxNote = `Kur: EUR ${fx.EUR.toFixed(2)} · USD ${fx.USD.toFixed(2)} (${fx.source === "tcmb" ? "TCMB" : fx.source})`;
    preview = probe.items.map((raw) => ({ raw, row: mapCustomItem(raw, cfg, fx) }));
  }
  const statusBadge = feed.isActive ? (
    <StatusBadge tone="ok">Aktif</StatusBadge>
  ) : complete ? (
    <StatusBadge tone="neutral">Pasif</StatusBadge>
  ) : (
    <StatusBadge tone="warn">Kurulum bekliyor</StatusBadge>
  );
  const fieldOptions = (
    <>
      <option value="">— Kullanma —</option>
      {fields.map((f) => (
        <option key={f.path} value={f.path}>
          {f.path}
          {f.samples[0] ? ` · ${f.samples[0].slice(0, 40)}` : ""}
        </option>
      ))}
    </>
  );

  return (
    <>
      <PageHeader
        title={feed.name}
        description={maskFeedUrl(feed.url)}
        crumbs={[{ label: "XML senkron", href: "/integrations/xml" }]}
        actions={
          <>
            {statusBadge}
            {complete ? (
              <form action={withBase(`/api/xml-sources/${id}`)} method="post">
                <input type="hidden" name="_action" value="toggle" />
                <button className="btn btn-secondary" type="submit">
                  {feed.isActive ? "Pasife al" : "Aktif et"}
                </button>
              </form>
            ) : null}
            {feed.isActive && complete ? (
              <form action={withBase(`/api/xml-sources/${id}`)} method="post">
                <input type="hidden" name="_action" value="run" />
                <button className="btn btn-primary" type="submit" disabled={server.running}>
                  <IconRefresh />
                  {server.running ? "Senkron çalışıyor…" : "Şimdi çek ve içe aktar"}
                </button>
              </form>
            ) : null}
          </>
        }
      />
      {sp.ok && OK_TEXT[sp.ok] ? <Alert tone="ok">{OK_TEXT[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {probe.ok === false && probe.error && !sp.hata ? <Alert>Son bağlantı denemesi başarısız: {probe.error}</Alert> : null}

      <div className="grid-2">
        <div>
          <Panel title="Alan eşleştirme" description="XML’deki alanların sitedeki karşılığı. Otomatik tahmin edildi; kontrol edin.">
            {fields.length === 0 ? (
              <EmptyState title="Henüz alan algılanmadı" description="Sağdaki bağlantı bilgilerini kontrol edip “Kaydet ve yeniden bağlan”a basın." />
            ) : (
              <form action={withBase(`/api/xml-sources/${id}`)} method="post" className="panel-pad form-stack">
                <input type="hidden" name="_action" value="save" />
                <div className="form-row">
                  {CUSTOM_FIELD_LABELS.map((f) => (
                    <div key={f.key} className="field">
                      <label htmlFor={`m-${f.key}`}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </label>
                      <select className="input" id={`m-${f.key}`} name={`field_${f.key}`} defaultValue={cfg.mapping[f.key] ?? ""}>
                        {fieldOptions}
                      </select>
                      {f.hint ? <small className="field-hint">{f.hint}</small> : null}
                    </div>
                  ))}
                </div>

                <h3 className="subhead">Fiyat ve stok</h3>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="m-cur">Fiyat para birimi</label>
                    <select className="input" id="m-cur" name="currency" defaultValue={cfg.currency}>
                      <option value="TRY">Türk lirası (TL)</option>
                      <option value="USD">Dolar (USD) → TL’ye çevrilir</option>
                      <option value="EUR">Euro (EUR) → TL’ye çevrilir</option>
                      <option value="field">XML’deki alandan oku</option>
                    </select>
                    <small className="field-hint">Döviz TCMB satış kuruyla her senkronda güncellenir.</small>
                  </div>
                  <div className="field">
                    <label htmlFor="m-curf">Para birimi alanı</label>
                    <select className="input" id="m-curf" name="currencyField" defaultValue={cfg.currencyField}>
                      {fieldOptions}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="m-vat">XML fiyatı</label>
                    <select className="input" id="m-vat" name="vat" defaultValue={cfg.vat}>
                      <option value="incl">KDV dahil</option>
                      <option value="excl">KDV hariç (KDV eklenir)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="m-vatr">KDV oranı (%)</label>
                    <input className="input" id="m-vatr" name="vatRate" type="number" min={0} max={50} defaultValue={cfg.vatRate} />
                  </div>
                  <div className="field">
                    <label htmlFor="m-mar">Satış fiyatı</label>
                    <select className="input" id="m-mar" name="margin" defaultValue={cfg.margin}>
                      <option value="tiers">Fiyat oranları sayfasındaki kâr dilimleri</option>
                      <option value="fixed">Sabit kâr oranı</option>
                      <option value="none">XML fiyatını aynen kullan</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="m-marp">Sabit kâr oranı (%)</label>
                    <input className="input" id="m-marp" name="marginPct" type="number" step="0.1" min={-50} max={500} defaultValue={cfg.marginPct} />
                  </div>
                  <div className="field">
                    <label htmlFor="m-ds">Stok alanı yoksa varsayılan stok</label>
                    <input className="input" id="m-ds" name="defaultStock" type="number" min={0} max={1000} defaultValue={cfg.defaultStock} />
                    <small className="field-hint">0 bırakılırsa stok alanı eşleşmeyen ürünler “tükendi” görünür.</small>
                  </div>
                </div>
                {!feed.isActive ? (
                  <div className="form-stack" style={{ gap: "0.4rem" }}>
                    <label className="check">
                      <input type="checkbox" name="activate" value="1" defaultChecked /> Kaydettikten sonra kaynağı aktif et
                    </label>
                    <label className="check">
                      <input type="checkbox" name="runNow" value="1" defaultChecked /> Hemen ürünleri çekmeye başla
                    </label>
                  </div>
                ) : null}
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit">
                    Eşleştirmeyi kaydet
                  </button>
                </div>
              </form>
            )}
          </Panel>

          {complete && probe.ok ? (
            <Panel title="Önizleme" description={`Kaynaktan ilk ${preview.length} ürün, kayıtlı ayarlarla hesaplandı${fxNote ? ` · ${fxNote}` : ""}`}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Marka / OEM</th>
                      <th>XML fiyatı</th>
                      <th>Satış fiyatı</th>
                      <th>Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(({ raw, row }, i) =>
                      row ? (
                        <tr key={`${row.externalId}-${i}`}>
                          <td>
                            <div className="cell-product">
                              {row.imageUrl ? <img src={row.imageUrl} alt="" width={40} height={40} loading="lazy" /> : null}
                              <div>
                                <strong>{row.name}</strong>
                                <div className="muted text-sm mono">
                                  {row.sku}
                                  {row.category ? ` · ${row.category}` : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-sm">
                            {row.manufacturer ?? "—"}
                            {row.oem ? <div className="muted mono">{row.oem}</div> : null}
                          </td>
                          <td className="text-sm mono">{raw[cfg.mapping.price ?? ""] ?? "—"}</td>
                          <td>
                            <strong>{formatTry(Number(row.price))}</strong>
                            {row.compareAtPrice ? <div className="muted text-sm" style={{ textDecoration: "line-through" }}>{formatTry(Number(row.compareAtPrice))}</div> : null}
                          </td>
                          <td>{row.stock > 0 ? <StatusBadge tone="ok">{row.stock}</StatusBadge> : <StatusBadge tone="bad">Yok</StatusBadge>}</td>
                        </tr>
                      ) : (
                        <tr key={`skip-${i}`}>
                          <td colSpan={5} className="muted text-sm">
                            Atlanacak satır (stok kodu, ad veya geçerli fiyat eksik): {raw[cfg.mapping.name ?? ""] || raw[cfg.mapping.sku ?? ""] || "—"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}

          {fields.length ? (
            <Panel title="Algılanan alanlar" description={`“${probe.itemTag}” etiketi · ilk ${probe.itemCount} üründen örnekler`}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Alan</th>
                      <th>Örnek değerler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.path}>
                        <td className="mono text-sm">{f.path}</td>
                        <td className="text-sm">{f.samples.length ? f.samples.join(" · ") : <span className="muted">boş</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}

          <Panel title="İçe aktarma geçmişi">
            {runs.length === 0 ? (
              <EmptyState title="Henüz çalışmadı" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Başlangıç</th>
                      <th>Durum</th>
                      <th>Toplam</th>
                      <th>İşlenen</th>
                      <th>Aynı</th>
                      <th>Atlanan/hata</th>
                      <th>Satıştan kalkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id}>
                        <td className="text-sm">{formatDate(r.startedAt ?? r.createdAt)}</td>
                        <td>
                          <StatusBadge tone={r.status === "failed" ? "bad" : r.status === "running" ? "info" : r.failedCount ? "warn" : "ok"}>
                            {r.status === "running" ? "Çalışıyor" : r.status === "failed" ? "Hata" : "Tamamlandı"}
                          </StatusBadge>
                        </td>
                        <td>{r.total.toLocaleString("tr-TR")}</td>
                        <td>{r.createdCount.toLocaleString("tr-TR")}</td>
                        <td>{r.unchangedCount.toLocaleString("tr-TR")}</td>
                        <td>{r.failedCount.toLocaleString("tr-TR")}</td>
                        <td>{r.inactivatedCount.toLocaleString("tr-TR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div>
          <Panel title="Durum" padded>
            <dl className="dl">
              <div>
                <dt>Satıştaki ürün</dt>
                <dd>
                  <strong>{Number(productCount?.c ?? 0).toLocaleString("tr-TR")}</strong>
                </dd>
              </div>
              <div>
                <dt>Tedarikçi kodu</dt>
                <dd className="mono">{supplier?.code ?? "—"}</dd>
              </div>
              <div>
                <dt>Ürün etiketi</dt>
                <dd className="mono">{cfg.itemTag || "—"}</dd>
              </div>
              <div>
                <dt>Son bağlantı testi</dt>
                <dd>{probe.probedAt ? `${relativeTime(probe.probedAt)} · ${probe.ok ? "başarılı" : "başarısız"}` : "—"}</dd>
              </div>
              <div>
                <dt>Sunucudaki dosya</dt>
                <dd>{file.exists ? `${(file.size / 1e6).toFixed(1)} MB · ${formatDate(file.mtime!)}` : "Henüz indirilmedi"}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Bağlantı" padded>
            <form action={withBase(`/api/xml-sources/${id}`)} method="post" className="form-stack">
              <input type="hidden" name="_action" value="connect" />
              <FeedConnectionFields name={feed.name} cfg={cfg} secret={secret} />
              <button className="btn btn-secondary" type="submit">
                Kaydet ve yeniden bağlan
              </button>
            </form>
          </Panel>

          <Panel title="Kaynağı sil" padded>
            <p className="muted text-sm" style={{ marginTop: 0 }}>
              Kaynak silinince bu tedarikçiden gelen ürünler satıştan kaldırılır. Sipariş geçmişi korunur.
            </p>
            <form action={withBase(`/api/xml-sources/${id}`)} method="post">
              <input type="hidden" name="_action" value="delete" />
              <ConfirmButton className="btn btn-danger" message={`“${feed.name}” silinsin ve ürünleri satıştan kaldırılsın mı?`}>
                <IconTrash />
                Kaynağı sil
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}

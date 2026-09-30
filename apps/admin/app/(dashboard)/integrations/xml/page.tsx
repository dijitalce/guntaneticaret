import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, xmlFeeds, xmlImportRowErrors, xmlImportRuns } from "@guntan/db";
import { customFeedPath, feedConfigFromRow, isCustomFeed, maskFeedUrl } from "@guntan/import";
import { mappingIsComplete } from "@/src/feed-source";
import { withBase } from "@/src/paths";
import { feedFileInfo, readServerSync } from "@/src/server-sync";
import { IconAlert, IconCheckCircle, IconClock, IconPlus, IconRefresh } from "@/src/icons";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { TabNav, relativeTime } from "@/src/ui-ext";
import { CatalogExportTab } from "@/src/catalog-export-tab";
import { AutoRefresh } from "@/src/auto-refresh";
import { SyncLogView } from "@/src/sync-log-view";

export const metadata = { title: "XML senkron" };
export const dynamic = "force-dynamic";

const RUN_LABEL: Record<string, string> = {
  queued: "Sırada",
  running: "Çalışıyor",
  completed: "Tamamlandı",
  success: "Tamamlandı",
  failed: "Hata",
  stale: "Yarım kaldı",
};

const FEED_SOURCE: Record<string, string> = {
  altay: "Eryaz (Altay) servisinden XML olarak indirilir",
  basbug: "Başbuğ API'sinden JSON olarak çekilir",
};

function feedSource(name: string, mapping: unknown) {
  if (isCustomFeed(mapping)) return "Panelden eklenen XML adresinden indirilir";
  const key = name.toLowerCase().includes("başbuğ") || name.toLowerCase().includes("basbug") ? "basbug" : "altay";
  return FEED_SOURCE[key];
}

function isLocalPath(path: string | null) {
  return Boolean(path && /^\/Users\/|^[A-Z]:\\/.test(path));
}

function formatBytes(n: number) {
  if (!n) return "—";
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;
}

function XmlTabs({ active }: { active: "senkron" | "disa-aktar" }) {
  return (
    <TabNav
      label="XML bölümleri"
      active={active}
      items={[
        { key: "senkron", label: "Tedarikçi senkronu", href: "/integrations/xml" },
        { key: "disa-aktar", label: "Dışa aktarım linkleri", href: "/integrations/xml?sekme=disa-aktar" },
      ]}
    />
  );
}

export default async function XmlPage({ searchParams }: { searchParams: Promise<{ ok?: string; hata?: string; sekme?: string; site?: string }> }) {
  const sp = await searchParams;
  if (sp.sekme === "disa-aktar") {
    return (
      <>
        <PageHeader
          title="XML senkron"
          description="Birleştirilmiş kataloğunuzu parçalı ve her zaman güncel XML linkleriyle dışarıya verin."
        />
        <XmlTabs active="disa-aktar" />
        {sp.hata ? <Alert>{sp.hata}</Alert> : null}
        <CatalogExportTab site={sp.site} ok={sp.ok} />
      </>
    );
  }
  const [feeds, runs, errors] = await Promise.all([
    db.select().from(xmlFeeds),
    db
      .select({ run: xmlImportRuns, feedName: xmlFeeds.name })
      .from(xmlImportRuns)
      .leftJoin(xmlFeeds, eq(xmlFeeds.id, xmlImportRuns.feedId))
      .orderBy(desc(xmlImportRuns.createdAt))
      .limit(25),
    db.select().from(xmlImportRowErrors).orderBy(desc(xmlImportRowErrors.createdAt)).limit(20),
  ]);
  const server = readServerSync();
  const customFeeds = feeds.filter((f) => isCustomFeed(f.mapping));
  const status = server.status;
  const plannedStages = [
    ...(server.eryazReady ? ["Altay XML indir"] : []),
    ...(server.basbugReady ? ["Başbuğ API çek"] : []),
    "Altay import",
    ...customFeeds.filter((f) => f.isActive).map((f) => `${f.name} (XML kaynağı)`),
    "Başbuğ import",
  ];
  const stateTone = server.running ? "info" : status?.state === "ok" ? "ok" : status?.state === "warning" ? "warn" : status?.state === "failed" ? "bad" : "neutral";
  const stateLabel = server.running
    ? "Çalışıyor"
    : status?.state === "ok"
      ? "Başarılı"
      : status?.state === "warning"
        ? "Uyarılarla bitti"
        : status?.state === "failed"
          ? "Hata"
          : "Henüz sunucuda çalışmadı";

  return (
    <>
      <PageHeader
        title="XML senkron"
        description="Tedarikçi ürün, fiyat ve stok senkronu tamamen sunucuda çalışır; bilgisayarınızın açık olması gerekmez."
        actions={
          <>
          <Link className="btn btn-secondary" href="/integrations/xml/sources/new">
            <IconPlus />
            Yeni XML kaynağı
          </Link>
          <form action={withBase("/api/sync/run")} method="post">
            <button className="btn btn-primary" type="submit" disabled={server.running}>
              <IconRefresh />
              {server.running ? "Senkron çalışıyor…" : "Sunucuda şimdi senkronize et"}
            </button>
          </form>
          </>
        }
      />
      <XmlTabs active="senkron" />
      {sp.ok === "basladi" ? (
        <Alert tone="ok">Senkron sunucuda başlatıldı. Büyük katalogda 10-40 dakika sürebilir; bu sayfayı yenileyerek ilerlemeyi izleyebilirsiniz.</Alert>
      ) : null}
      {sp.ok === "kaynak-silindi" ? <Alert tone="ok">XML kaynağı silindi; ürünleri satıştan kaldırıldı.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {!server.envFile.exists && !server.processEnvReady ? (
        <Alert tone="warn">
          Eryaz ve Başbuğ kullanıcı bilgileri bulunamadı. Bunları hPanel ortam değişkenlerine (ERYAZ_*, BASBUG_*) ekleyin; yoksa senkron indirme
          adımını atlar ve yalnızca mevcut dosyaları içe aktarır.
        </Alert>
      ) : !server.envFile.exists ? (
        <Alert tone="warn">
          Tedarikçi bilgileri ortam değişkenlerinde var; panelden başlatılan senkron çalışır. Zamanlanmış görev için{" "}
          <code>{server.envFile.path}</code> dosyası yazılamadı; site yeniden başladığında tekrar denenecek.
        </Alert>
      ) : null}

      {server.running ? <AutoRefresh everyMs={4000} /> : null}
      <Panel
        title={server.running ? "Senkron canlı takip" : "Son senkron"}
        description={server.running ? "Sayfa kendiliğinden yenilenir; her adımın ilerlemesi burada görünür." : "Hangi adımın ne kadar sürdüğü ve ne yaptığı"}
      >
        <SyncLogView lines={server.logTail} planned={plannedStages} running={server.running} logFile={server.logFile} />
      </Panel>

      <div className="grid-2">
        <div>
          <Panel title="Sunucu senkronu" description="Zamanlanmış görev (12 saatte bir) ve panelden başlatılan çalışmalar">
            <div className="sync-status">
              <div className="sync-status-main">
                <span className={`sync-state is-${stateTone}`}>
                  {server.running ? <IconClock /> : status?.state === "ok" ? <IconCheckCircle /> : <IconAlert />}
                </span>
                <div>
                  <strong>{stateLabel}</strong>
                  <span className="muted text-sm">
                    {server.running && server.lockSince
                      ? `${relativeTime(server.lockSince)} başladı`
                      : status?.finishedAt
                        ? `Son bitiş: ${formatDate(status.finishedAt)} · ${status.trigger?.startsWith("panel") ? "panelden" : "zamanlanmış görev"}`
                        : "Kayıt yok"}
                  </span>
                </div>
              </div>
              {status?.errors?.length ? (
                <ul className="note-list">
                  {status.errors.map((e) => (
                    <li key={e} className="text-bad">
                      {e}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kaynak</th>
                    <th>Bağlantı</th>
                    <th>Sunucudaki dosya</th>
                    <th>Son indirme</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Eryaz (Altay)</strong>
                    </td>
                    <td>{server.eryazReady ? <StatusBadge tone="ok">Ayarlı</StatusBadge> : <StatusBadge tone="warn">Bilgi yok</StatusBadge>}</td>
                    <td className="mono text-sm">{server.altay?.exists ? formatBytes(server.altay.size) : "Henüz indirilmedi"}</td>
                    <td>{server.altay?.mtime ? formatDate(server.altay.mtime) : "—"}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Başbuğ</strong>
                    </td>
                    <td>{server.basbugReady ? <StatusBadge tone="ok">Ayarlı</StatusBadge> : <StatusBadge tone="warn">Bilgi yok</StatusBadge>}</td>
                    <td className="mono text-sm">{server.basbug?.exists ? formatBytes(server.basbug.size) : "Henüz indirilmedi"}</td>
                    <td>{server.basbug?.mtime ? formatDate(server.basbug.mtime) : "—"}</td>
                  </tr>
                  {customFeeds.map((f) => {
                    const file = feedFileInfo(customFeedPath(f.id));
                    return (
                      <tr key={f.id}>
                        <td>
                          <Link href={`/integrations/xml/sources/${f.id}`}>
                            <strong>{f.name}</strong>
                          </Link>
                        </td>
                        <td>
                          {f.isActive ? (
                            <StatusBadge tone="ok">Aktif</StatusBadge>
                          ) : mappingIsComplete(feedConfigFromRow(f.url, f.mapping)) ? (
                            <StatusBadge tone="neutral">Pasif</StatusBadge>
                          ) : (
                            <StatusBadge tone="warn">Kurulum bekliyor</StatusBadge>
                          )}
                        </td>
                        <td className="mono text-sm">{file.exists ? formatBytes(file.size) : "Henüz indirilmedi"}</td>
                        <td>{file.mtime ? formatDate(file.mtime) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="İçe aktarma geçmişi">
            {runs.length === 0 ? (
              <EmptyState title="Çalışma yok" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kaynak</th>
                      <th>Durum</th>
                      <th>Başlangıç</th>
                      <th>Toplam</th>
                      <th>Eklenen</th>
                      <th>Güncellenen</th>
                      <th>Aynı</th>
                      <th>Hata</th>
                      <th>Pasif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map(({ run: r, feedName }) => {
                      const stale = r.status === "running" && Date.now() - new Date(r.createdAt).getTime() > 6 * 3600_000;
                      const key = stale ? "stale" : r.status;
                      return (
                        <tr key={r.id}>
                          <td>{feedName ?? "—"}</td>
                          <td>
                            <StatusBadge tone={key === "failed" || key === "stale" ? "bad" : key === "running" ? "info" : "ok"}>
                              {RUN_LABEL[key] ?? key}
                            </StatusBadge>
                          </td>
                          <td className="text-sm">{formatDate(r.startedAt ?? r.createdAt)}</td>
                          <td>{r.total.toLocaleString("tr-TR")}</td>
                          <td>{r.createdCount.toLocaleString("tr-TR")}</td>
                          <td>{r.updatedCount.toLocaleString("tr-TR")}</td>
                          <td>{r.unchangedCount.toLocaleString("tr-TR")}</td>
                          <td>{r.failedCount.toLocaleString("tr-TR")}</td>
                          <td>{r.inactivatedCount.toLocaleString("tr-TR")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div>
          <Panel
            title="Tedarikçi kaynakları"
            padded
            action={
              <Link className="btn btn-secondary btn-sm" href="/integrations/xml/sources/new">
                <IconPlus width={14} height={14} />
                Ekle
              </Link>
            }
          >
            <ul className="link-list">
              {feeds.map((f) => (
                <li key={f.id}>
                  {isCustomFeed(f.mapping) ? (
                    <Link href={`/integrations/xml/sources/${f.id}`}>
                      <strong>{f.name}</strong>
                    </Link>
                  ) : (
                    <strong>{f.name}</strong>
                  )}
                  <span className="muted text-sm">{feedSource(f.name, f.mapping)}</span>
                  {isCustomFeed(f.mapping) ? (
                    <span className="mono text-sm">{maskFeedUrl(f.url)}</span>
                  ) : isLocalPath(f.filePath) ? (
                    <span className="text-warn text-sm">
                      Son içe aktarma bir bilgisayardan yapılmış. Sunucudaki ilk senkronla kaynak otomatik olarak sunucuya geçer.
                    </span>
                  ) : f.filePath ? (
                    <span className="mono text-sm">{f.filePath}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Diğer işlem" padded>
            <p className="muted text-sm" style={{ marginTop: 0 }}>
              İndirmeyi atlayıp sunucudaki son dosyalarla yalnızca içe aktarma, fiyat hesaplama ve görünürlük derlemesini yeniden çalıştırır.
            </p>
            <form action={withBase("/api/sync/run")} method="post">
              <input type="hidden" name="mode" value="import" />
              <button className="btn btn-secondary" type="submit" disabled={server.running}>
                Yalnızca içe aktar
              </button>
            </form>
          </Panel>
          <Panel title="Son satır hataları" padded>
            {errors.length === 0 ? (
              <p className="muted text-sm" style={{ margin: 0 }}>
                Hata kaydı yok.
              </p>
            ) : (
              <ul className="note-list">
                {errors.map((e) => (
                  <li key={e.id}>
                    <code>{e.externalId}</code>: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

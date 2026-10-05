import Link from "next/link";
import { listMarketingContacts, listPopups } from "@guntan/db";
import { IconPlus } from "@/src/icons";
import { MarketingNav } from "@/src/marketing-nav";
import { StatusToggle } from "@/src/status-toggle";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { percent } from "@/src/ui-ext";

const SOURCE_LABEL: Record<string, string> = { popup: "Popup", form: "Bülten formu", unsubscribe: "Abonelikten çıktı", checkout: "Ödeme sayfası", register: "Üyelik" };

export const metadata = { title: "Popup'lar" };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { newsletter: "Bülten", coupon: "Kupon", announcement: "Duyuru" };
const TRIGGER: Record<string, string> = { delay: "Gecikmeli", exit: "Çıkarken", scroll: "Kaydırınca" };

export default async function PopupsPage({ searchParams }: { searchParams: Promise<{ ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const [popups, contacts] = await Promise.all([listPopups(), listMarketingContacts(100)]);
  const active = contacts.filter((c) => !c.unsubscribed_at).length;

  return (
    <>
      <PageHeader
        title="Popup'lar"
        description="Ziyaretçilerden e-posta toplayın, kupon verin veya duyuru gösterin."
        actions={
          <Link className="btn btn-primary" href="/marketing/popups/new">
            <IconPlus />
            Yeni popup
          </Link>
        }
      />
      <MarketingNav active="popups" />
      {sp.ok === "silindi" ? <Alert tone="ok">Popup silindi.</Alert> : null}
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Kaydedildi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <Panel>
        {popups.length === 0 ? (
          <EmptyState title="Henüz popup yok" description="Bülten kaydı popup'ı ile pazarlama listenizi büyütmeye başlayın." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Popup</th>
                  <th>Tür</th>
                  <th>Görüntülenme</th>
                  <th>Tıklama</th>
                  <th>Kayıt</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {popups.map((p) => (
                  <tr key={p.id} className="row-link" data-href={`/marketing/popups/${p.id}`}>
                    <td>
                      <Link href={`/marketing/popups/${p.id}`}>
                        <strong>{p.name}</strong>
                      </Link>
                      <div className="muted text-sm">
                        {p.title} · {TRIGGER[p.trigger_type] ?? p.trigger_type}
                      </div>
                    </td>
                    <td>{KIND[p.kind] ?? p.kind}</td>
                    <td>{Number(p.views).toLocaleString("tr-TR")}</td>
                    <td>
                      {Number(p.clicks).toLocaleString("tr-TR")} <span className="muted text-sm">({percent(Number(p.clicks), Number(p.views))})</span>
                    </td>
                    <td>
                      {Number(p.leads).toLocaleString("tr-TR")} <span className="muted text-sm">({percent(Number(p.leads), Number(p.views))})</span>
                    </td>
                    <td>
                      <StatusToggle
                        action={`/api/popups/${p.id}`}
                        fields={{ _action: "toggle", back: "list" }}
                        on={Boolean(p.is_active)}
                        tone={p.is_active ? "ok" : "neutral"}
                        label={p.is_active ? "Yayında" : "Kapalı"}
                        turnOn="Yayına al"
                        turnOff="Kapat"
                      />
                      {p.ends_at ? <div className="muted text-sm">Bitiş: {formatDate(p.ends_at, false)}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="Bülten aboneleri" description={`Son 100 kayıt · ${active} aktif abone`}>
        {contacts.length === 0 ? (
          <EmptyState title="Henüz abone yok" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>E-posta</th>
                  <th>Ad</th>
                  <th>Kaynak</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.email}>
                    <td>{c.email}</td>
                    <td>{c.full_name ?? "—"}</td>
                    <td className="text-sm muted">{c.source ? (SOURCE_LABEL[c.source] ?? c.source) : "—"}</td>
                    <td>
                      <StatusBadge tone={c.unsubscribed_at ? "bad" : "ok"}>{c.unsubscribed_at ? "Ayrıldı" : "Abone"}</StatusBadge>
                    </td>
                    <td className="text-sm muted">{formatDate(c.created_at, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

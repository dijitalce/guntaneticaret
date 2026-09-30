import Link from "next/link";
import { listCampaigns } from "@guntan/db";
import { IconMail, IconMessage } from "@/src/icons";
import { CAMPAIGN_STATUS } from "@/src/campaign-status";
import { MarketingNav } from "@/src/marketing-nav";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate, formatTry } from "@/src/ui";
import { TabNav, percent } from "@/src/ui-ext";

export const metadata = { title: "Kampanyalar" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ kanal?: string; ok?: string }> }) {
  const sp = await searchParams;
  const channel = sp.kanal === "sms" ? "sms" : "email";
  const list = await listCampaigns(channel);
  const totals = list.reduce(
    (a, c) => ({ sent: a.sent + c.stats.sent, opened: a.opened + c.stats.opened, clicked: a.clicked + c.stats.clicked, orders: a.orders + c.stats.orders, revenue: a.revenue + c.stats.revenue }),
    { sent: 0, opened: 0, clicked: 0, orders: 0, revenue: 0 },
  );

  return (
    <>
      <PageHeader
        title="Kampanyalar"
        description="Segmentlere e-posta ve SMS kampanyaları gönderin; açılma, tıklama ve getirdiği satışları izleyin."
        actions={
          <Link className="btn btn-primary" href={`/marketing/campaigns/new?kanal=${channel}`}>
            {channel === "sms" ? <IconMessage /> : <IconMail />}
            Yeni {channel === "sms" ? "SMS" : "e-posta"} kampanyası
          </Link>
        }
      />
      <MarketingNav active="campaigns" />
      {sp.ok === "silindi" ? <Alert tone="ok">Kampanya silindi.</Alert> : null}
      <TabNav
        label="Kanal"
        active={channel}
        items={[
          { key: "email", label: "E-posta", href: "/marketing/campaigns" },
          { key: "sms", label: "SMS", href: "/marketing/campaigns?kanal=sms" },
        ]}
      />
      <div className="kpis">
        <Kpi label="Gönderilen" value={totals.sent.toLocaleString("tr-TR")} />
        {channel === "email" ? <Kpi label="Açılma oranı" value={percent(totals.opened, totals.sent)} /> : null}
        <Kpi label="Tıklama oranı" value={percent(totals.clicked, totals.sent)} />
        <Kpi label="Kampanya cirosu" value={formatTry(totals.revenue)} hint={`${totals.orders} sipariş`} tone="ok" />
      </div>
      <Panel>
        {list.length === 0 ? (
          <EmptyState title="Henüz kampanya yok" description="İlk kampanyanızı oluşturup önce kendinize test gönderebilirsiniz." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kampanya</th>
                  <th>Durum</th>
                  <th>Gönderilen</th>
                  {channel === "email" ? <th>Açılma</th> : null}
                  <th>Tıklama</th>
                  <th>Satış</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const st = CAMPAIGN_STATUS[c.status] ?? { label: c.status, tone: "neutral" as const };
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/marketing/campaigns/${c.id}`}>
                          <strong>{c.name}</strong>
                        </Link>
                        {c.subject ? <div className="muted text-sm">{c.subject}</div> : null}
                      </td>
                      <td>
                        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                        {c.status === "draft" && c.scheduled_at ? <div className="muted text-sm">Zamanlandı: {formatDate(c.scheduled_at)}</div> : null}
                      </td>
                      <td>
                        {c.stats.sent.toLocaleString("tr-TR")}
                        {c.stats.queued ? <span className="muted text-sm"> (+{c.stats.queued} sırada)</span> : null}
                      </td>
                      {channel === "email" ? <td>{percent(c.stats.opened, c.stats.sent)}</td> : null}
                      <td>{percent(c.stats.clicked, c.stats.sent)}</td>
                      <td>
                        {c.stats.orders ? (
                          <>
                            {formatTry(c.stats.revenue)} <span className="muted text-sm">({c.stats.orders})</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-sm muted">{formatDate(c.started_at ?? c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

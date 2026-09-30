import { notFound } from "next/navigation";
import { campaignStatsMap, getCampaign, getTenantContext, renderCampaignEmail, segmentSizes } from "@guntan/db";
import { CampaignForm } from "@/src/campaign-form";
import { CAMPAIGN_STATUS } from "@/src/campaign-status";
import { ConfirmButton } from "@/src/form-fields";
import { IconSend, IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel, StatusBadge, formatDate, formatTry } from "@/src/ui";
import { StatRow, percent } from "@/src/ui-ext";

export const metadata = { title: "Kampanya" };
export const dynamic = "force-dynamic";

const OK: Record<string, string> = {
  olusturuldu: "Taslak oluşturuldu. Kendinize test gönderip kontrol edin, ardından gönderimi başlatın.",
  kaydedildi: "Taslak kaydedildi.",
  test: "Test mesajı gönderildi.",
  iptal: "Kampanya iptal edildi; sıradaki mesajlar gönderilmeyecek.",
};

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string; adet?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const [statsMap, segments, tenant] = await Promise.all([campaignStatsMap([id]), segmentSizes(), getTenantContext(campaign.tenant_id)]);
  const stats = statsMap.get(id)!;
  const segment = segments.find((s) => s.key === campaign.segment_key);
  const st = CAMPAIGN_STATUS[campaign.status] ?? { label: campaign.status, tone: "neutral" as const };
  const action = withBase(`/api/campaigns/${id}`);
  const preview =
    campaign.channel === "email"
      ? renderCampaignEmail(campaign, { siteName: tenant.name, siteUrl: tenant.url, logoUrl: tenant.logoUrl, name: "Ayşe Yılmaz", email: "ornek@ornek.com", messageId: "onizleme" })
      : null;
  const reachable = segment?.reachable ?? 0;

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={`${campaign.channel === "sms" ? "SMS" : "E-posta"} · ${segment?.name ?? campaign.segment_key} · Oluşturan: ${campaign.created_by ?? "—"}`}
        crumbs={[{ href: `/marketing/campaigns${campaign.channel === "sms" ? "?kanal=sms" : ""}`, label: "Kampanyalar" }]}
        actions={<StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
      />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.ok === "gonderiliyor" ? (
        <Alert tone="ok">{sp.adet} alıcı kuyruğa alındı. Gönderim arka planda küçük partiler halinde yapılıyor; bu sayfayı yenileyerek takip edebilirsiniz.</Alert>
      ) : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      {campaign.status !== "draft" ? (
        <Panel padded>
          <StatRow
            items={[
              { label: "Alıcı", value: Number(campaign.total).toLocaleString("tr-TR"), hint: stats.queued ? `${stats.queued} sırada` : undefined },
              { label: "Gönderildi", value: stats.sent.toLocaleString("tr-TR"), hint: stats.failed ? `${stats.failed} hata · ${stats.skipped} atlandı` : stats.skipped ? `${stats.skipped} atlandı` : undefined },
              ...(campaign.channel === "email" ? [{ label: "Açılma", value: percent(stats.opened, stats.sent), hint: `${stats.opened} kişi` }] : []),
              { label: "Tıklama", value: percent(stats.clicked, stats.sent), hint: `${stats.clicked} kişi` },
              { label: "Satış", value: formatTry(stats.revenue), hint: `${stats.orders} sipariş` },
            ]}
          />
          <p className="muted text-sm" style={{ margin: "0.75rem 0 0" }}>
            Başladı: {formatDate(campaign.started_at)} {campaign.finished_at ? `· Bitti: ${formatDate(campaign.finished_at)}` : ""}
          </p>
        </Panel>
      ) : null}

      <div className="grid-2">
        <div>
          {campaign.status === "draft" ? (
            <Panel title="Kampanya içeriği" padded>
              <CampaignForm campaign={campaign} channel={campaign.channel} />
            </Panel>
          ) : (
            <Panel title="İçerik" padded>
              {campaign.subject ? (
                <p style={{ marginTop: 0 }}>
                  <span className="muted text-sm">Konu:</span> <strong>{campaign.subject}</strong>
                </p>
              ) : null}
              {campaign.channel === "sms" ? <div className="sms-bubble">{campaign.body}</div> : null}
            </Panel>
          )}
          {preview ? (
            <Panel title="Önizleme">
              <iframe className="mail-preview" title="Kampanya önizleme" srcDoc={preview.html} sandbox="" />
            </Panel>
          ) : null}
        </div>
        <div>
          {campaign.status === "draft" ? (
            <Panel title="Gönder" padded>
              <form action={action} method="post" className="form-stack">
                <input type="hidden" name="_action" value="send" />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>{reachable.toLocaleString("tr-TR")}</strong> kişiye {campaign.channel === "sms" ? "SMS" : "e-posta"} gönderilecek
                  {campaign.channel === "sms" ? " (telefonu olanlar)" : ""}.
                </p>
                {campaign.scheduled_at ? (
                  <p className="muted text-sm" style={{ margin: 0 }}>
                    Zamanlandı: {formatDate(campaign.scheduled_at)} — o saatte otomatik başlar. Hemen başlatmak için aşağıdaki düğmeyi kullanın.
                  </p>
                ) : null}
                <ConfirmButton className="btn btn-primary" message={`${reachable} kişiye gönderim başlatılsın mı? Bu işlem geri alınamaz.`}>
                  <IconSend />
                  Gönderimi başlat
                </ConfirmButton>
              </form>
            </Panel>
          ) : null}
          <Panel title="Test gönder" padded>
            <form action={action} method="post" className="form-stack">
              <input type="hidden" name="_action" value="test" />
              <div className="field">
                <label htmlFor="t-to">{campaign.channel === "sms" ? "Telefon" : "E-posta"}</label>
                <input className="input" id="t-to" name="to" required placeholder={campaign.channel === "sms" ? "05xx xxx xx xx" : "siz@firma.com"} />
              </div>
              <button className="btn btn-secondary" type="submit">
                Test gönder
              </button>
            </form>
          </Panel>
          {campaign.status === "sending" ? (
            <Panel padded>
              <form action={action} method="post" className="op-block">
                <input type="hidden" name="_action" value="cancel" />
                <div>
                  <strong>Gönderimi durdur</strong>
                  <small className="muted"> Sıradaki {stats.queued} mesaj gönderilmez.</small>
                </div>
                <ConfirmButton className="btn btn-secondary btn-sm" message="Kampanya durdurulsun mu?">
                  Durdur
                </ConfirmButton>
              </form>
            </Panel>
          ) : null}
          {campaign.status !== "sending" ? (
            <Panel padded>
              <form action={action} method="post" className="danger-zone">
                <input type="hidden" name="_action" value="delete" />
                <div>
                  <strong>Kampanyayı sil</strong>
                  <small>Gönderim kayıtları istatistiklerde kalır.</small>
                </div>
                <ConfirmButton className="btn btn-danger btn-sm" message="Kampanya silinsin mi?">
                  <IconTrash />
                  Sil
                </ConfirmButton>
              </form>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}

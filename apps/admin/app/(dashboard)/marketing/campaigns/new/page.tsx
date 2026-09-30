import { CampaignForm } from "@/src/campaign-form";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Yeni kampanya" };
export const dynamic = "force-dynamic";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ kanal?: string; hata?: string; segment?: string }> }) {
  const sp = await searchParams;
  const channel = sp.kanal === "sms" ? "sms" : "email";
  return (
    <>
      <PageHeader
        title={channel === "sms" ? "Yeni SMS kampanyası" : "Yeni e-posta kampanyası"}
        description="Önce taslak oluşturulur; test gönderip kontrol ettikten sonra gönderimi başlatırsınız."
        crumbs={[{ href: "/marketing/campaigns", label: "Kampanyalar" }]}
      />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="form-page is-wide">
        <Panel padded>
          <CampaignForm channel={channel} segment={sp.segment} />
        </Panel>
      </div>
    </>
  );
}

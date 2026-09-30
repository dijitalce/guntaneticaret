import { cancelCampaign, deleteCampaign, getCampaign, saveCampaign, sendCampaignTest, startCampaign } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";
import { campaignFromForm } from "../../../../src/campaign-input";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const back = `/marketing/campaigns/${id}`;
  const campaign = await getCampaign(id);
  if (!campaign) return redirectTo(request, "/marketing/campaigns");
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "campaign", entityId: id, action: act, after });

  if (action === "delete") {
    await deleteCampaign(id);
    await audit("delete", { name: campaign.name });
    return redirectTo(request, "/marketing/campaigns", { ok: "silindi" });
  }
  if (action === "cancel") {
    await cancelCampaign(id);
    await audit("cancel");
    return redirectTo(request, back, { ok: "iptal" });
  }
  if (action === "test") {
    const to = text(form, "to");
    if (!to) return redirectTo(request, back, { hata: "Test alıcısını yazın." });
    const r = await sendCampaignTest(id, to).catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    await audit("test", { to, ok: r.ok });
    return redirectTo(request, back, r.ok ? { ok: "test" } : { hata: `Test gönderilemedi: ${r.error ?? ""}` });
  }
  if (action === "send") {
    try {
      const count = await startCampaign(id);
      await audit("send", { recipients: count });
      return redirectTo(request, back, { ok: "gonderiliyor", adet: String(count) });
    } catch (err) {
      return redirectTo(request, back, { hata: err instanceof Error ? err.message : "Gönderilemedi." });
    }
  }

  if (campaign.status !== "draft") return redirectTo(request, back, { hata: "Gönderilmiş kampanya düzenlenemez." });
  const input = campaignFromForm(form);
  if ("error" in input) return redirectTo(request, back, { hata: input.error });
  await saveCampaign(id, input, session.user.email);
  await audit("update", { name: input.name, segment: input.segmentKey, scheduledAt: input.scheduledAt });
  return redirectTo(request, back, { ok: "kaydedildi" });
}

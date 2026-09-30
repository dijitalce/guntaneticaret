import { saveCampaign } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../src/api-helpers";
import { campaignFromForm } from "../../../src/campaign-input";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const input = campaignFromForm(form);
  if ("error" in input) return redirectTo(request, `/marketing/campaigns/new?kanal=${text(form, "channel") || "email"}`, { hata: input.error });
  const id = await saveCampaign(null, input, session.user.email);
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "campaign", entityId: id, action: "create", after: { name: input.name, channel: input.channel, segment: input.segmentKey } });
  return redirectTo(request, `/marketing/campaigns/${id}`, { ok: "olusturuldu" });
}

import {
  TEMPLATES,
  getNotifySettings,
  getTemplateOverrides,
  saveNotifySettings,
  saveTemplateOverrides,
  sendEmailRaw,
  sendSmsRaw,
  type NotifySettings,
} from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";

const MASK = "••••••••";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const action = text(form, "_action");
  const back = "/settings/notifications";
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "notification", entityId: "settings", action: act, after });

  if (action === "provider") {
    const cur = await getNotifySettings();
    const emailProvider = text(form, "emailProvider");
    const next: NotifySettings = {
      emailProvider: emailProvider === "resend" || emailProvider === "brevo" ? emailProvider : "none",
      emailApiKey: text(form, "emailApiKey") && text(form, "emailApiKey") !== MASK ? text(form, "emailApiKey") : cur.emailApiKey,
      fromEmail: text(form, "fromEmail"),
      fromName: text(form, "fromName"),
      replyTo: text(form, "replyTo"),
      adminEmails: text(form, "adminEmails"),
      smsProvider: text(form, "smsProvider") === "netgsm" ? "netgsm" : "none",
      netgsmUser: text(form, "netgsmUser"),
      netgsmPass: text(form, "netgsmPass") && text(form, "netgsmPass") !== MASK ? text(form, "netgsmPass") : cur.netgsmPass,
      netgsmHeader: text(form, "netgsmHeader"),
    };
    if (form.get("clearEmailKey") === "1") next.emailApiKey = "";
    await saveNotifySettings(next);
    await audit("update", { ...next, emailApiKey: next.emailApiKey ? "(gizli)" : "", netgsmPass: next.netgsmPass ? "(gizli)" : "" });
    return redirectTo(request, `${back}?sekme=ayarlar`, { ok: "kaydedildi" });
  }

  if (action === "test_email" || action === "test_sms") {
    const settings = await getNotifySettings();
    const to = text(form, "to");
    const result =
      action === "test_email"
        ? await sendEmailRaw(settings, {
            to,
            subject: "Test e-postası",
            html: "<p>Bu bir test e-postasıdır. Bildirim ayarlarınız çalışıyor.</p>",
          })
        : await sendSmsRaw(settings, { to, text: "Test SMS: bildirim ayarlariniz calisiyor." });
    await audit("test", { channel: action === "test_email" ? "email" : "sms", to, ok: result.ok });
    return redirectTo(request, `${back}?sekme=ayarlar`, result.ok ? { ok: "test" } : { hata: `Gönderilemedi: ${result.error ?? "bilinmeyen hata"}` });
  }

  if (action === "toggles") {
    const group = text(form, "group");
    const overrides = await getTemplateOverrides();
    const next = { ...overrides };
    for (const t of TEMPLATES.filter((x) => x.group === group)) {
      next[t.key] = { ...next[t.key], email: form.get(`${t.key}.email`) === "1", sms: form.get(`${t.key}.sms`) === "1" };
    }
    await saveTemplateOverrides(next);
    await audit("update", { group });
    return redirectTo(request, `${back}?sekme=${encodeURIComponent(group)}`, { ok: "kaydedildi" });
  }

  return redirectTo(request, back);
}

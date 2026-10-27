import {
  ADMIN_NOTIFY_EVENTS,
  TEMPLATES,
  csvList,
  emailLayout,
  getNotifySettings,
  getTemplateOverrides,
  saveNotifySettings,
  saveTemplateOverrides,
  sendEmailRaw,
  sendSmsRaw,
  verifySmtp,
  type AdminNotifyEvent,
  type NotifySettings,
} from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";

const MASK = "••••••••";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROVIDERS = ["smtp", "resend", "brevo"] as const;

/** Virgül/boşluk/satırla ayrılmış adresleri temizler, geçersizleri atar. */
function emailCsv(value: string) {
  return [...new Set(csvList(value).map((e) => e.toLowerCase()).filter((e) => EMAIL_RE.test(e)))].slice(0, 20).join(", ");
}

function secretField(form: FormData, key: string, current: string) {
  const v = typeof form.get(key) === "string" ? String(form.get(key)) : "";
  return v && v !== MASK ? v : current;
}

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
    const security = text(form, "smtpSecurity");
    const port = Math.round(Number(text(form, "smtpPort")));
    const adminRecipients: NotifySettings["adminRecipients"] = {};
    for (const e of ADMIN_NOTIFY_EVENTS) {
      const v = emailCsv(text(form, `recipients.${e.key}`));
      if (v) adminRecipients[e.key as AdminNotifyEvent] = v;
    }
    const next: NotifySettings = {
      emailProvider: (PROVIDERS as readonly string[]).includes(emailProvider) ? (emailProvider as NotifySettings["emailProvider"]) : "none",
      emailApiKey: secretField(form, "emailApiKey", cur.emailApiKey),
      smtpHost: text(form, "smtpHost").slice(0, 191),
      smtpPort: Number.isFinite(port) && port > 0 && port < 65536 ? port : 465,
      smtpSecurity: security === "starttls" || security === "none" ? security : "ssl",
      smtpUser: text(form, "smtpUser").slice(0, 191),
      // Şifrenin başındaki/sonundaki boşluk anlamlı olabilir; trim edilmez.
      smtpPass: secretField(form, "smtpPass", cur.smtpPass),
      fromEmail: text(form, "fromEmail"),
      fromName: text(form, "fromName"),
      replyTo: text(form, "replyTo"),
      adminEmails: emailCsv(text(form, "adminEmails")),
      adminRecipients,
      smsProvider: text(form, "smsProvider") === "netgsm" ? "netgsm" : "none",
      netgsmUser: text(form, "netgsmUser"),
      netgsmPass: text(form, "netgsmPass") && text(form, "netgsmPass") !== MASK ? text(form, "netgsmPass") : cur.netgsmPass,
      netgsmHeader: text(form, "netgsmHeader"),
    };
    if (form.get("clearEmailKey") === "1") next.emailApiKey = "";
    if (form.get("clearSmtpPass") === "1") next.smtpPass = "";
    await saveNotifySettings(next);
    await audit("update", {
      ...next,
      emailApiKey: next.emailApiKey ? "(gizli)" : "",
      smtpPass: next.smtpPass ? "(gizli)" : "",
      netgsmPass: next.netgsmPass ? "(gizli)" : "",
    });
    if (text(form, "then") === "verify" && next.emailProvider === "smtp") {
      const r = await verifySmtp(next);
      return redirectTo(request, `${back}?sekme=ayarlar`, r.ok ? { ok: "smtp" } : { hata: `Ayarlar kaydedildi ancak SMTP bağlantısı başarısız: ${r.error ?? ""}` });
    }
    return redirectTo(request, `${back}?sekme=ayarlar`, { ok: "kaydedildi" });
  }

  if (action === "verify_smtp") {
    const r = await verifySmtp(await getNotifySettings());
    await audit("test", { channel: "smtp_verify", ok: r.ok });
    return redirectTo(request, `${back}?sekme=ayarlar`, r.ok ? { ok: "smtp" } : { hata: `SMTP bağlantısı başarısız: ${r.error ?? ""}` });
  }

  if (action === "test_email" || action === "test_sms") {
    const settings = await getNotifySettings();
    const to = text(form, "to");
    if (action === "test_sms") {
      const result = await sendSmsRaw(settings, { to, text: "Test SMS: bildirim ayarlariniz calisiyor." });
      await audit("test", { channel: "sms", to, ok: result.ok });
      return redirectTo(request, `${back}?sekme=ayarlar`, result.ok ? { ok: "test" } : { hata: `Gönderilemedi: ${result.error ?? "bilinmeyen hata"}` });
    }
    const recipients = csvList(to).filter((e) => EMAIL_RE.test(e)).slice(0, 20);
    if (!recipients.length) return redirectTo(request, `${back}?sekme=ayarlar`, { hata: "Geçerli bir e-posta adresi girin." });
    const html = emailLayout({
      siteName: settings.fromName || "Mağaza",
      siteUrl: process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com",
      logoUrl: null,
      body: `<h2>Test e-postası</h2><p>Bu e-posta yönetim panelinden gönderildi; bildirim ayarlarınız çalışıyor.</p><p>Gönderim yöntemi: <strong>${settings.emailProvider.toUpperCase()}</strong>${settings.emailProvider === "smtp" ? ` (${settings.smtpHost}:${settings.smtpPort})` : ""}<br>Gönderen: ${settings.fromEmail}</p>`,
      footer: "",
    });
    const failures: string[] = [];
    for (const r of recipients) {
      const result = await sendEmailRaw(settings, { to: r, subject: "Test e-postası", html });
      if (!result.ok) failures.push(`${r}: ${result.error ?? "bilinmeyen hata"}`);
    }
    await audit("test", { channel: "email", to: recipients, ok: failures.length === 0 });
    if (failures.length) return redirectTo(request, `${back}?sekme=ayarlar`, { hata: `Gönderilemedi — ${failures.join(" · ").slice(0, 600)}` });
    return redirectTo(request, `${back}?sekme=ayarlar`, { ok: "test" });
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

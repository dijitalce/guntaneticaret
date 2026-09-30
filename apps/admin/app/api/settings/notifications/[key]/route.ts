import { TEMPLATES, getNotifySettings, getTemplateOverrides, resolveTemplate, saveTemplateOverrides, sendEmailRaw, sendSmsRaw } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";
import { loadPreviewVars, renderPreview } from "../../../../../src/template-samples";

export async function POST(request: Request, ctx: { params: Promise<{ key: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { key } = await ctx.params;
  const def = TEMPLATES.find((t) => t.key === key);
  if (!def) return redirectTo(request, "/settings/notifications");
  const back = `/settings/notifications/${key}`;
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const audit = (act: string, before?: unknown, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "notification_template", entityId: key, action: act, before, after });
  const overrides = await getTemplateOverrides();

  if (action === "reset") {
    const next = { ...overrides };
    const before = next[key];
    next[key] = { email: before?.email, sms: before?.sms };
    await saveTemplateOverrides(next);
    await audit("update", before, { reset: true });
    return redirectTo(request, back, { ok: "sifirlandi" });
  }

  if (action === "test") {
    const tpl = await resolveTemplate(key);
    if (!tpl) return redirectTo(request, back);
    const settings = await getNotifySettings();
    const preview = renderPreview(tpl, await loadPreviewVars());
    const to = text(form, "to");
    const channel = text(form, "channel");
    const result =
      channel === "sms"
        ? await sendSmsRaw(settings, { to, text: preview.sms })
        : await sendEmailRaw(settings, { to, subject: `[TEST] ${preview.subject}`, html: preview.html });
    await audit("test", undefined, { channel, to, ok: result.ok });
    return redirectTo(request, back, result.ok ? { ok: "test" } : { hata: `Gönderilemedi: ${result.error ?? "bilinmeyen hata"}` });
  }

  const subject = text(form, "subject");
  const body = String(form.get("body") ?? "").trim();
  const smsBody = text(form, "smsBody");
  const next = {
    ...overrides,
    [key]: {
      email: form.get("email") === "1",
      sms: form.get("sms") === "1",
      subject: subject && subject !== def.subject ? subject.slice(0, 255) : undefined,
      body: body && body !== def.body ? body.slice(0, 50_000) : undefined,
      smsBody: smsBody && smsBody !== def.smsBody ? smsBody.slice(0, 600) : undefined,
    },
  };
  await saveTemplateOverrides(next);
  await audit("update", overrides[key] ?? null, next[key]);
  return redirectTo(request, back, { ok: "kaydedildi" });
}

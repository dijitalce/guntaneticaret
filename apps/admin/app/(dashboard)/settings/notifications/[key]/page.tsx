import { notFound } from "next/navigation";
import { TEMPLATES, TEMPLATE_GROUPS, TEMPLATE_VARIABLES, getTemplateOverrides, resolveTemplate } from "@guntan/db";
import { ConfirmButton } from "@/src/form-fields";
import { withBase } from "@/src/paths";
import { renderPreview } from "@/src/template-samples";
import { Alert, PageHeader, Panel, StatusBadge } from "@/src/ui";
import { Toggle } from "@/src/ui-ext";

export const metadata = { title: "Bildirim şablonu" };
export const dynamic = "force-dynamic";

const OK: Record<string, string> = {
  kaydedildi: "Şablon kaydedildi. Bundan sonraki gönderimlerde bu içerik kullanılır.",
  sifirlandi: "Şablon varsayılan içeriğe döndürüldü.",
  test: "Test mesajı gönderildi (örnek verilerle).",
};

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const def = TEMPLATES.find((t) => t.key === key);
  if (!def) notFound();
  const [tpl, overrides] = await Promise.all([resolveTemplate(key), getTemplateOverrides()]);
  if (!tpl) notFound();
  const o = overrides[key] ?? {};
  const customized = Boolean(o.subject || o.body || o.smsBody);
  const preview = renderPreview(tpl);
  const group = TEMPLATE_GROUPS.find((g) => g.key === def.group);
  const action = withBase(`/api/settings/notifications/${key}`);

  return (
    <>
      <PageHeader
        title={def.label}
        description={def.description}
        crumbs={[
          { href: "/settings/notifications", label: "Bildirimler" },
          { href: `/settings/notifications?sekme=${def.group}`, label: group?.label ?? def.group },
        ]}
        actions={customized ? <StatusBadge tone="violet">Özelleştirildi</StatusBadge> : <StatusBadge>Varsayılan</StatusBadge>}
      />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="grid-2">
        <div>
          <Panel title="İçerik" padded>
            <form action={action} method="post" className="form-stack">
              <input type="hidden" name="_action" value="save" />
              <div className="form-row">
                <Toggle name="email" defaultChecked={tpl.email} label="E-posta gönder" />
                <Toggle name="sms" defaultChecked={tpl.sms} label="SMS gönder" />
              </div>
              <div className="field">
                <label htmlFor="subject">E-posta konusu</label>
                <input className="input" id="subject" name="subject" defaultValue={tpl.subject} />
              </div>
              <div className="field">
                <label htmlFor="body">E-posta içeriği (HTML)</label>
                <textarea className="input mono" id="body" name="body" rows={14} defaultValue={tpl.body} spellCheck={false} />
                <small className="field-hint">
                  Basit HTML kullanabilirsiniz: {"<h2>, <p>, <strong>, <a class=\"btn\" href=\"...\">"}. Logo ve alt bilgi otomatik eklenir.
                </small>
              </div>
              <div className="field">
                <label htmlFor="smsBody">SMS metni</label>
                <textarea className="input" id="smsBody" name="smsBody" rows={3} defaultValue={tpl.smsBody} maxLength={600} />
                <small className="field-hint">Türkçe karakterler SMS maliyetini artırabilir. 155 karakter ≈ 1 SMS.</small>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  Şablonu kaydet
                </button>
              </div>
            </form>
            {customized ? (
              <form action={action} method="post" className="danger-zone" style={{ marginTop: "1rem" }}>
                <input type="hidden" name="_action" value="reset" />
                <div>
                  <strong>Varsayılana döndür</strong>
                  <small>Konu, içerik ve SMS metni orijinal haline döner.</small>
                </div>
                <ConfirmButton className="btn btn-secondary btn-sm" message="Şablon varsayılana döndürülsün mü?">
                  Sıfırla
                </ConfirmButton>
              </form>
            ) : null}
          </Panel>

          <Panel title="Kullanılabilir değişkenler" padded>
            <div className="var-grid">
              {TEMPLATE_VARIABLES.map((v) => (
                <div key={v.key}>
                  <code>{`{{${v.key}}}`}</code>
                  <span className="muted text-sm">{v.label}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div>
          <Panel title="Önizleme" description="Örnek verilerle; kaydettikten sonra güncellenir">
            <div className="panel-pad">
              <div className="mail-subject">
                <span className="muted text-sm">Konu:</span> <strong>{preview.subject}</strong>
              </div>
            </div>
            <iframe className="mail-preview" title="E-posta önizleme" srcDoc={preview.html} sandbox="" />
            {tpl.sms || def.sms ? (
              <div className="panel-pad">
                <div className="sms-bubble">{preview.sms}</div>
                <span className="muted text-sm">{preview.sms.length} karakter</span>
              </div>
            ) : null}
          </Panel>
          <Panel title="Test gönder" padded>
            <form action={action} method="post" className="form-stack">
              <input type="hidden" name="_action" value="test" />
              <div className="field">
                <label htmlFor="to">Alıcı</label>
                <input className="input" id="to" name="to" required placeholder="siz@firma.com veya 05xx…" />
              </div>
              <div className="op-actions">
                <button className="btn btn-secondary" type="submit" name="channel" value="email">
                  E-posta olarak gönder
                </button>
                <button className="btn btn-secondary" type="submit" name="channel" value="sms">
                  SMS olarak gönder
                </button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, type KeyboardEvent } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parse(value: string) {
  return [...new Set(value.split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

/** Birden fazla e-posta adresini etiket olarak düzenler; formda virgülle ayrılmış tek alan gönderir. */
export function EmailListField({
  id,
  name,
  label,
  hint,
  defaultValue = "",
  placeholder = "ad@firma.com",
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [items, setItems] = useState(() => parse(defaultValue));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function commit(raw = draft) {
    const next = parse(raw);
    if (!next.length) return true;
    const bad = next.filter((e) => !EMAIL_RE.test(e));
    if (bad.length) {
      setError(`Geçersiz adres: ${bad.join(", ")}`);
      return false;
    }
    setItems((cur) => [...new Set([...cur, ...next])]);
    setDraft("");
    setError("");
    return true;
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " " || e.key === "Tab") {
      if (!draft.trim()) return;
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && items.length) {
      setItems((cur) => cur.slice(0, -1));
    }
  }

  const value = [...items, ...parse(draft).filter((d) => EMAIL_RE.test(d))].join(", ");

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`email-list${error ? " is-invalid" : ""}`} onClick={() => document.getElementById(id)?.focus()}>
        {items.map((e) => (
          <span key={e} className="email-chip">
            {e}
            <button type="button" aria-label={`${e} adresini kaldır`} onClick={() => setItems((cur) => cur.filter((x) => x !== e))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          className="email-list-input"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={draft}
          placeholder={items.length ? "Başka adres ekle…" : placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]/.test(v)) commit(v);
            else setDraft(v);
          }}
          onKeyDown={onKey}
          onBlur={() => commit()}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (/[,;\s]/.test(t.trim())) {
              e.preventDefault();
              commit(t);
            }
          }}
        />
      </div>
      <input type="hidden" name={name} value={value} />
      {error ? <small className="field-error">{error}</small> : hint ? <small className="field-hint">{hint}</small> : null}
    </div>
  );
}

type Provider = "none" | "smtp" | "resend" | "brevo";

const PRESETS: { label: string; host: string; port: number; security: "ssl" | "starttls" }[] = [
  { label: "Hostinger", host: "smtp.hostinger.com", port: 465, security: "ssl" },
  { label: "Gmail / Workspace", host: "smtp.gmail.com", port: 465, security: "ssl" },
  { label: "Yandex", host: "smtp.yandex.com", port: 465, security: "ssl" },
  { label: "Outlook / 365", host: "smtp.office365.com", port: 587, security: "starttls" },
];

/** Sağlayıcı seçimine göre SMTP veya API anahtarı alanlarını gösterir. */
export function EmailProviderFields({
  provider: initial,
  smtpHost,
  smtpPort,
  smtpSecurity,
  smtpUser,
  hasSmtpPass,
  hasApiKey,
  mask,
}: {
  provider: Provider;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "ssl" | "starttls" | "none";
  smtpUser: string;
  hasSmtpPass: boolean;
  hasApiKey: boolean;
  mask: string;
}) {
  const [provider, setProvider] = useState<Provider>(initial);
  const [host, setHost] = useState(smtpHost);
  const [port, setPort] = useState(String(smtpPort || 465));
  const [security, setSecurity] = useState(smtpSecurity);
  const [showPass, setShowPass] = useState(false);

  return (
    <>
      <div className="field">
        <label htmlFor="emailProvider">Gönderim yöntemi</label>
        <select className="select" id="emailProvider" name="emailProvider" value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
          <option value="none">Kapalı</option>
          <option value="smtp">SMTP (kendi e-posta sunucunuz)</option>
          <option value="resend">Resend API</option>
          <option value="brevo">Brevo (Sendinblue) API</option>
        </select>
      </div>

      {provider === "smtp" ? (
        <>
          <div className="field">
            <span className="field-caption">Hazır ayar</span>
            <div className="op-actions">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setHost(p.host);
                    setPort(String(p.port));
                    setSecurity(p.security);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="smtpHost">SMTP sunucusu</label>
              <input className="input mono" id="smtpHost" name="smtpHost" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.alanadiniz.com" required autoComplete="off" />
            </div>
            <div className="field" style={{ maxWidth: 120 }}>
              <label htmlFor="smtpPort">Port</label>
              <input className="input mono" id="smtpPort" name="smtpPort" type="number" min={1} max={65535} value={port} onChange={(e) => setPort(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="smtpSecurity">Güvenlik</label>
            <select
              className="select"
              id="smtpSecurity"
              name="smtpSecurity"
              value={security}
              onChange={(e) => {
                const v = e.target.value as typeof security;
                setSecurity(v);
                if (v === "ssl" && port === "587") setPort("465");
                if (v === "starttls" && port === "465") setPort("587");
              }}
            >
              <option value="ssl">SSL/TLS (genelde port 465)</option>
              <option value="starttls">STARTTLS (genelde port 587)</option>
              <option value="none">Şifresiz (önerilmez, port 25)</option>
            </select>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="smtpUser">Kullanıcı adı</label>
              <input className="input" id="smtpUser" name="smtpUser" defaultValue={smtpUser} placeholder="Genelde e-posta adresinin tamamı" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="smtpPass">Şifre</label>
              <div className="input-with-chips">
                <input
                  className="input"
                  id="smtpPass"
                  name="smtpPass"
                  type={showPass ? "text" : "password"}
                  defaultValue={hasSmtpPass ? mask : ""}
                  autoComplete="new-password"
                  onFocus={(e) => {
                    if (e.target.value === mask) e.target.select();
                  }}
                />
                <button type="button" className="chip" onClick={() => setShowPass((v) => !v)} aria-pressed={showPass}>
                  {showPass ? "Gizle" : "Göster"}
                </button>
              </div>
              <small className="field-hint">
                {hasSmtpPass ? "Kayıtlı şifre gizli tutulur; değiştirmek için yenisini yazın." : "Gmail için uygulama şifresi kullanın."}
              </small>
              {hasSmtpPass ? (
                <label className="inline-check text-sm">
                  <input type="checkbox" name="clearSmtpPass" value="1" /> Kayıtlı şifreyi sil
                </label>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <input type="hidden" name="smtpHost" value={host} />
      )}
      {provider !== "smtp" ? (
        <>
          <input type="hidden" name="smtpPort" value={port} />
          <input type="hidden" name="smtpSecurity" value={security} />
          <input type="hidden" name="smtpUser" value={smtpUser} />
        </>
      ) : null}

      {provider === "resend" || provider === "brevo" ? (
        <div className="field">
          <label htmlFor="emailApiKey">API anahtarı</label>
          <input className="input" id="emailApiKey" name="emailApiKey" type="password" defaultValue={hasApiKey ? mask : ""} autoComplete="off" />
          <small className="field-hint">Kayıtlı anahtar gizli gösterilir; değiştirmek için yenisini yapıştırın.</small>
        </div>
      ) : null}
    </>
  );
}

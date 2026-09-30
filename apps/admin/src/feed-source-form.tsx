import type { FeedSecret } from "@guntan/db";
import type { CustomFeedConfig } from "@guntan/import";
import { SECRET_MASK } from "./feed-source";

const AUTH_OPTIONS = [
  { v: "none", l: "Açık adres", h: "Adres herkese açık veya anahtar adresin içinde (?key=…)" },
  { v: "basic", l: "Kullanıcı adı + şifre", h: "HTTP Basic kimlik doğrulama" },
  { v: "header", l: "API anahtarı (başlık)", h: "Örn. X-Api-Key veya Authorization" },
];

export function FeedConnectionFields({ name, cfg, secret }: { name?: string; cfg?: CustomFeedConfig; secret?: FeedSecret }) {
  const auth = cfg?.auth ?? "none";
  return (
    <>
      <div className="form-row">
        <div className="field">
          <label htmlFor="fs-name">Kaynak adı</label>
          <input className="input" id="fs-name" name="name" required maxLength={120} defaultValue={name ?? ""} placeholder="Örn. Dinamik Oto XML" />
        </div>
        <div className="field">
          <label htmlFor="fs-tag">Ürün etiketi (isteğe bağlı)</label>
          <input className="input mono" id="fs-tag" name="itemTag" defaultValue={cfg?.itemTag ?? ""} placeholder="Otomatik algılanır (ör. urun, product)" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="fs-url">XML adresi</label>
        <input className="input mono" id="fs-url" name="url" type="url" required defaultValue={cfg?.url ?? ""} placeholder="https://tedarikci.com/xml/urunler.xml?key=..." />
        <small className="field-hint">Tedarikçinin verdiği XML bağlantısı. Sunucu bu adrese bağlanır; bilgisayarınızın açık olması gerekmez.</small>
      </div>
      <div className="field">
        <label>Erişim türü</label>
        <div className="choice-grid is-3">
          {AUTH_OPTIONS.map((o) => (
            <label key={o.v} className="choice">
              <input type="radio" name="auth" value={o.v} defaultChecked={auth === o.v} />
              <span>
                <strong>{o.l}</strong>
                <small>{o.h}</small>
              </span>
            </label>
          ))}
        </div>
      </div>
      <fieldset className="fieldset">
        <legend>Kullanıcı adı + şifre ile erişim</legend>
        <div className="form-row">
          <div className="field">
            <label htmlFor="fs-user">Kullanıcı adı</label>
            <input className="input" id="fs-user" name="username" autoComplete="off" defaultValue={secret?.username ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="fs-pass">Şifre</label>
            <input className="input" id="fs-pass" name="password" type="password" autoComplete="new-password" defaultValue={secret?.password ? SECRET_MASK : ""} />
          </div>
        </div>
      </fieldset>
      <fieldset className="fieldset">
        <legend>API anahtarı ile erişim</legend>
        <div className="form-row">
          <div className="field">
            <label htmlFor="fs-hn">Başlık adı</label>
            <input className="input mono" id="fs-hn" name="headerName" defaultValue={secret?.headerName ?? ""} placeholder="X-Api-Key" />
          </div>
          <div className="field">
            <label htmlFor="fs-hv">Anahtar</label>
            <input className="input" id="fs-hv" name="headerValue" type="password" autoComplete="off" defaultValue={secret?.headerValue ? SECRET_MASK : ""} />
          </div>
        </div>
      </fieldset>
      <small className="field-hint">Şifre ve anahtarlar veritabanında saklanır, kod deposuna yazılmaz ve panelde gizli gösterilir.</small>
    </>
  );
}

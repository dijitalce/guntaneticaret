"use client";

import { useState, type ReactNode } from "react";

export function resolveAssetUrl(src: string, storefrontUrl: string) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
  return `${storefrontUrl.replace(/\/$/, "")}${src.startsWith("/") ? "" : "/"}${src}`;
}

function toSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function NameSlugFields({
  label,
  defaultName = "",
  slug,
  urlPrefix,
  placeholder,
}: {
  label: string;
  defaultName?: string;
  /** Mevcut kayıtlarda slug kilitlidir (senkron eşleşmesi ve vitrin adresleri için). */
  slug?: string;
  urlPrefix: string;
  placeholder?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [customSlug, setCustomSlug] = useState("");
  const locked = slug != null;
  const effective = locked ? slug : customSlug ? toSlug(customSlug) : toSlug(name);

  return (
    <>
      <div className="field">
        <label htmlFor="name">{label}</label>
        <input className="input" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} required />
      </div>
      <div className="field">
        <label htmlFor="slug">Adres (slug)</label>
        {locked ? (
          <input className="input" id="slug" value={slug} readOnly disabled />
        ) : (
          <input
            className="input"
            id="slug"
            name="slug"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
            placeholder={toSlug(name) || "otomatik"}
          />
        )}
        <small className="field-hint">
          {urlPrefix}
          <strong>{effective || "…"}</strong>
          {locked ? " · Vitrin adresi ve tedarikçi eşleşmesi bozulmasın diye değiştirilemez." : ""}
        </small>
      </div>
    </>
  );
}

export function ImageUrlField({
  name,
  label,
  defaultValue = "",
  storefrontUrl,
  hint,
  fallback,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  storefrontUrl: string;
  hint?: ReactNode;
  fallback: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [broken, setBroken] = useState(false);
  const src = resolveAssetUrl(value.trim(), storefrontUrl);

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="image-field">
        <div className="image-preview">
          {src && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" onError={() => setBroken(true)} />
          ) : (
            <span>{fallback}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="input"
            id={name}
            name={name}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setBroken(false);
            }}
            placeholder="/brands/ornek.png veya https://…"
          />
          <small className="field-hint">{broken ? "Görsel yüklenemedi, adresi kontrol edin." : hint}</small>
        </div>
      </div>
    </div>
  );
}

export function ConfirmButton({
  message,
  children,
  className,
  name,
  value,
  title,
}: {
  message: string;
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
  title?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      name={name}
      value={value}
      title={title}
      aria-label={title}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

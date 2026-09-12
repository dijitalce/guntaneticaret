"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

const STORAGE_KEY = "guntan-build-notice";

export function LaunchNotice({
  whatsapp,
  phone,
}: {
  whatsapp: string | null;
  phone: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, []);

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!mounted || !open) return null;

  const waHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Merhaba, sipariş vermeden önce bilgi almak istiyorum.")}`
    : null;

  return createPortal(
    <div className="launch-notice-root" role="presentation">
      <button type="button" className="launch-notice-backdrop" aria-label="Kapat" onClick={dismiss} />
      <div
        className="launch-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-notice-title"
        aria-describedby="launch-notice-text"
      >
        <p className="launch-notice-kicker">Bilgilendirme</p>
        <h2 id="launch-notice-title">Sayfamız yapım aşamasındadır</h2>
        <p id="launch-notice-text">
          Lütfen siparişinizi geçmeden önce bizimle iletişime geçiniz.
        </p>
        <div className="launch-notice-actions">
          {waHref ? (
            <a className="btn btn-primary" href={waHref} target="_blank" rel="noreferrer" onClick={dismiss}>
              WhatsApp ile yazın
            </a>
          ) : (
            <Link className="btn btn-primary" href="/iletisim" onClick={dismiss}>
              İletişime geçin
            </Link>
          )}
          <button className="btn btn-secondary" type="button" onClick={dismiss}>
            Anladım
          </button>
        </div>
        {phone ? <p className="launch-notice-phone">{phone}</p> : null}
      </div>
    </div>,
    document.body,
  );
}

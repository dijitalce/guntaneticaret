"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  OPEN_CONSENT_EVENT,
  openConsentSettings,
  readConsent,
  saveConsent,
  type Consent,
} from "./consent";

/** İlk render'da null (sunucu çerezi bilmez); tarayıcıda okunur ve değişiklikleri dinler. */
export function useConsent() {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail ?? readConsent());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);
  return consent;
}

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className ?? "footer-link-btn"} onClick={openConsentSettings}>
      Çerez tercihleri
    </button>
  );
}

export function CookieConsent() {
  const consent = useConsent();
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const onOpen = () => {
      const c = readConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && consent) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, consent]);

  if (consent === undefined) return null;

  const decide = (next: { analytics: boolean; marketing: boolean }) => {
    saveConsent(next);
    setOpen(false);
  };

  if (open) {
    return (
      <div className="cookie-modal-backdrop" role="presentation">
        <div className="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-modal-title">
          <h2 id="cookie-modal-title">Çerez tercihleri</h2>
          <p>
            Hangi çerezlere izin verdiğinizi seçin. Tercihinizi istediğiniz zaman sayfanın altındaki “Çerez tercihleri” bağlantısından
            değiştirebilirsiniz. Ayrıntılar için <Link href="/sayfa/cerez-politikasi">Çerez Politikası</Link>’nı inceleyin.
          </p>
          <ul className="cookie-cats">
            <li>
              <div>
                <strong>Zorunlu çerezler</strong>
                <span>Sepet, oturum, güvenlik ve çerez tercihinizin saklanması için gereklidir; kapatılamaz.</span>
              </div>
              <span className="cookie-always">Her zaman açık</span>
            </li>
            <li>
              <label htmlFor="cc-analytics">
                <strong>Analitik çerezler</strong>
                <span>Ziyaret sayısı, gezilen sayfalar ve site performansını ölçmemizi sağlar (Google Analytics, site istatistikleri).</span>
              </label>
              <input id="cc-analytics" type="checkbox" className="cookie-switch" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            </li>
            <li>
              <label htmlFor="cc-marketing">
                <strong>Pazarlama çerezleri</strong>
                <span>
                  İlgi alanlarınıza uygun reklam gösterimi ve kampanya ölçümü için kullanılır (Google Ads, Meta, TikTok, Google Tag Manager),
                  yarım kalan sipariş hatırlatmaları dahil.
                </span>
              </label>
              <input id="cc-marketing" type="checkbox" className="cookie-switch" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            </li>
          </ul>
          <div className="cookie-actions">
            <button type="button" className="btn btn-secondary" onClick={() => decide({ analytics: false, marketing: false })}>
              Tümünü reddet
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => decide({ analytics, marketing })}>
              Seçimimi kaydet
            </button>
            <button type="button" className="btn btn-primary" onClick={() => decide({ analytics: true, marketing: true })}>
              Tümünü kabul et
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (consent) return null;

  return (
    <div className="cookie-banner" role="region" aria-label="Çerez bildirimi">
      <p>
        Sitemizde, alışverişinizin çalışması için zorunlu çerezler ile izin vermeniz halinde analitik ve pazarlama çerezleri kullanıyoruz.
        Ayrıntılar: <Link href="/sayfa/cerez-politikasi">Çerez Politikası</Link> · <Link href="/sayfa/gizlilik">Gizlilik</Link>
      </p>
      <div className="cookie-actions">
        <button type="button" className="btn btn-secondary" onClick={() => decide({ analytics: false, marketing: false })}>
          Reddet
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
          Tercihleri yönet
        </button>
        <button type="button" className="btn btn-primary" onClick={() => decide({ analytics: true, marketing: true })}>
          Tümünü kabul et
        </button>
      </div>
    </div>
  );
}

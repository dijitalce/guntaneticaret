"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useConsent } from "./cookie-consent";

const GA_RE = /^(G|UA|AW)-[A-Z0-9-]{4,}$/i;
const GTM_RE = /^GTM-[A-Z0-9]{4,}$/i;

const META_RE = /^\d{6,20}$/;
const TIKTOK_RE = /^[A-Z0-9]{8,30}$/i;
const ADS_RE = /^AW-\d{6,15}$/i;

export function Analytics({
  gaId,
  gtmId,
  metaPixelId,
  tiktokPixelId,
  googleAdsId,
  googleAdsLabel,
}: {
  gaId: string | null;
  gtmId: string | null;
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAdsId?: string | null;
  googleAdsLabel?: string | null;
}) {
  const consent = useConsent();
  const allowAnalytics = consent?.analytics === true;
  const allowMarketing = consent?.marketing === true;
  // Gelişmiş izin modu: GA her zaman yüklenir; onay yokken analytics_storage=denied ile çerezsiz çalışır.
  const ga = gaId && GA_RE.test(gaId) ? gaId : null;
  // GTM de izin modunu okur; içindeki Google etiketleri onay yokken çerezsiz çalışır.
  const gtm = gtmId && GTM_RE.test(gtmId) ? gtmId : null;
  // Pikseller de her zaman yüklenir (doğrulama araçları algılasın); pazarlama onayı yokken kendi izin komutlarıyla veri göndermez.
  const meta = metaPixelId && META_RE.test(metaPixelId) ? metaPixelId : null;
  const tiktok = tiktokPixelId && TIKTOK_RE.test(tiktokPixelId) ? tiktokPixelId : null;
  const ads = googleAdsId && ADS_RE.test(googleAdsId) ? googleAdsId : null;
  const decided = consent != null;
  const gtagId = ga ?? ads;
  const consentState = JSON.stringify({
    analytics_storage: allowAnalytics ? "granted" : "denied",
    ad_storage: allowMarketing ? "granted" : "denied",
    ad_user_data: allowMarketing ? "granted" : "denied",
    ad_personalization: allowMarketing ? "granted" : "denied",
  });
  useEffect(() => {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.("consent", "update", JSON.parse(consentState));
    (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event: "consent_update" });
  }, [consentState]);
  useEffect(() => {
    const w = window as unknown as {
      fbq?: (...args: unknown[]) => void;
      ttq?: { grantConsent?: () => void; revokeConsent?: () => void };
    };
    w.fbq?.("consent", allowMarketing ? "grant" : "revoke");
    if (decided) (allowMarketing ? w.ttq?.grantConsent : w.ttq?.revokeConsent)?.call(w.ttq);
  }, [allowMarketing, decided]);
  if (!ga && !gtm && !meta && !tiktok && !ads) return null;
  return (
    <>
      <Script id="consent-mode" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments);};gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});gtag('consent','update',${consentState});`}
      </Script>
      {meta ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('consent',${JSON.stringify(allowMarketing ? "grant" : "revoke")});fbq('init',${JSON.stringify(meta)});fbq('track','PageView');`}
        </Script>
      ) : null}
      {tiktok ? (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.${!decided ? "holdConsent" : allowMarketing ? "grantConsent" : "revokeConsent"}();ttq.load(${JSON.stringify(tiktok)});ttq.page();}(window,document,'ttq');`}
        </Script>
      ) : null}
      {gtm ? (
        <>
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtm)});`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="gtm"
            />
          </noscript>
        </>
      ) : null}
      {gtagId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;${ads && googleAdsLabel ? `window.__gtAdsSendTo=${JSON.stringify(`${ads}/${googleAdsLabel.replace(/[^A-Za-z0-9_-]/g, "")}`)};` : ""}gtag('js',new Date());${ga ? `gtag('config',${JSON.stringify(ga)});` : ""}${ads ? `gtag('config',${JSON.stringify(ads)});` : ""}`}
          </Script>
        </>
      ) : null}
    </>
  );
}

/** Panelden girilen özel <script> / <noscript> / <meta> parçalarını sayfaya ekler (canlı destek vb.); izleme pikselleri panelde kendi alanlarından, izin moduyla yüklenir. */
export function CustomScripts({ html }: { html: string }) {
  useEffect(() => {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const added: Node[] = [];
    for (const node of Array.from(tpl.content.childNodes)) {
      if (node instanceof HTMLScriptElement) {
        const s = document.createElement("script");
        for (const attr of Array.from(node.attributes)) s.setAttribute(attr.name, attr.value);
        s.text = node.text;
        document.body.appendChild(s);
        added.push(s);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = document.importNode(node, true);
        document.body.appendChild(el);
        added.push(el);
      }
    }
    return () => {
      for (const n of added) n.parentNode?.removeChild(n);
    };
  }, [html]);
  return null;
}

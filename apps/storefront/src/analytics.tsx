"use client";

import Script from "next/script";
import { useEffect } from "react";

const GA_RE = /^(G|UA|AW)-[A-Z0-9-]{4,}$/i;
const GTM_RE = /^GTM-[A-Z0-9]{4,}$/i;

export function Analytics({ gaId, gtmId }: { gaId: string | null; gtmId: string | null }) {
  const ga = gaId && GA_RE.test(gaId) ? gaId : null;
  const gtm = gtmId && GTM_RE.test(gtmId) ? gtmId : null;
  return (
    <>
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
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(ga)});`}
          </Script>
        </>
      ) : null}
    </>
  );
}

/** Panelden girilen özel <script> / <noscript> / <meta> parçalarını sayfaya ekler. */
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

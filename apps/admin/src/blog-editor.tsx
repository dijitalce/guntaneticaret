"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resolveAssetUrl } from "./form-fields";
import { IconAlert, IconCheck } from "./icons";
import { withBase } from "./paths";
import { Counter } from "./seo-editor";
import { SEO_LIMITS } from "./tenant-seo";

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
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

function plain(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function clip(s: string, max: number) {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

async function uploadImage(file: File, name: string): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("name", name);
  const res = await fetch(withBase("/api/content/blog/upload"), { method: "POST", body: fd });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Yükleme başarısız.");
  return json.url;
}

function ImageField({
  name,
  label,
  defaultValue,
  assetBase,
  slugHint,
  hint,
  onChange,
}: {
  name: string;
  label: string;
  defaultValue: string;
  assetBase: string;
  slugHint: string;
  hint?: string;
  onChange?: (url: string) => void;
}) {
  const [url, setUrlState] = useState(defaultValue);
  const setUrl = (v: string) => {
    setUrlState(v);
    onChange?.(v);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="field">
      <label htmlFor={`bf-${name}`}>{label}</label>
      <div className="input-with-chips">
        <input className="input" id={`bf-${name}`} name={name} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/blog-gorsel/... veya https://..." />
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Yükleniyor…" : "Yükle"}
        </button>
        {url ? (
          <button type="button" className="chip" onClick={() => setUrl("")}>
            Kaldır
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setError("");
          try {
            setUrl(await uploadImage(f, slugHint));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {url ? <img className="blog-cover-preview" src={resolveAssetUrl(url, assetBase)} alt="" /> : null}
      {error ? <small className="field-error">{error}</small> : hint ? <small className="field-hint">{hint}</small> : null}
    </div>
  );
}

type Cmd = { label: string; title: string; run: () => void; wide?: boolean };

function RichEditor({
  name,
  defaultValue,
  assetBase,
  slugHint,
  onChange,
}: {
  name: string;
  defaultValue: string;
  assetBase: string;
  slugHint: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [html, setHtml] = useState(defaultValue);
  const [source, setSource] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ref.current && !source) ref.current.innerHTML = html;
    // yalnızca mod değişiminde DOM'a yaz; yazarken imleç kaybolmasın
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  function sync() {
    const v = ref.current?.innerHTML ?? "";
    setHtml(v);
    onChange(v);
  }

  function exec(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }

  function block(tag: string) {
    exec("formatBlock", tag);
  }

  function insertHtml(snippet: string) {
    ref.current?.focus();
    document.execCommand("insertHTML", false, snippet);
    sync();
  }

  function absolutize(src: string) {
    return resolveAssetUrl(src, assetBase);
  }

  const cmds: Cmd[] = [
    { label: "P", title: "Paragraf", run: () => block("p") },
    { label: "H2", title: "Ana başlık (H2) — içindekiler tablosunda görünür", run: () => block("h2") },
    { label: "H3", title: "Alt başlık (H3)", run: () => block("h3") },
    { label: "H4", title: "Küçük başlık (H4)", run: () => block("h4") },
    { label: "B", title: "Kalın", run: () => exec("bold") },
    { label: "İ", title: "İtalik", run: () => exec("italic") },
    { label: "• Liste", title: "Madde işaretli liste", run: () => exec("insertUnorderedList"), wide: true },
    { label: "1. Liste", title: "Numaralı liste", run: () => exec("insertOrderedList"), wide: true },
    { label: "“ Alıntı", title: "Alıntı", run: () => block("blockquote"), wide: true },
    {
      label: "Bağlantı",
      title: "Bağlantı ekle — iç linkler için /kategori/... veya /urun/... yazın",
      wide: true,
      run: () => {
        const url = window.prompt("Bağlantı adresi (site içi için /kategori/fren-balatasi gibi):", "/");
        if (!url) return;
        if (!/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(url)) return window.alert("Adres /, https://, mailto: veya tel: ile başlamalı.");
        const sel = window.getSelection();
        if (sel && sel.isCollapsed) insertHtml(`<a href="${url.replace(/"/g, "&quot;")}">${url}</a>`);
        else exec("createLink", url);
      },
    },
    { label: "Linki kaldır", title: "Bağlantıyı kaldır", run: () => exec("unlink"), wide: true },
    { label: "Görsel", title: "Görsel yükle", run: () => fileRef.current?.click(), wide: true },
    {
      label: "Video",
      title: "YouTube videosu göm",
      wide: true,
      run: () => {
        const url = window.prompt("YouTube video adresi:");
        const id = url && /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(url)?.[1];
        if (!id) return;
        insertHtml(`<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video" allowfullscreen></iframe><p></p>`);
      },
    },
    {
      label: "Tablo",
      title: "3 sütunlu tablo ekle",
      wide: true,
      run: () =>
        insertHtml(
          "<table><thead><tr><th>Başlık</th><th>Başlık</th><th>Başlık</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p></p>",
        ),
    },
    { label: "—", title: "Ayraç çizgisi", run: () => insertHtml("<hr><p></p>") },
    { label: "Temizle", title: "Seçili metnin biçimini temizle", run: () => exec("removeFormat"), wide: true },
    { label: "↶", title: "Geri al", run: () => exec("undo") },
    { label: "↷", title: "Yinele", run: () => exec("redo") },
  ];

  return (
    <div className="rich-editor">
      <div className="rich-toolbar" role="toolbar" aria-label="Biçimlendirme">
        {!source
          ? cmds.map((c) => (
              <button
                key={c.title}
                type="button"
                className={`rich-btn${c.wide ? " is-wide" : ""}`}
                title={c.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={c.run}
                disabled={busy}
              >
                {c.label}
              </button>
            ))
          : null}
        <button
          type="button"
          className={`rich-btn is-wide rich-source${source ? " is-on" : ""}`}
          onClick={() => {
            if (!source) sync();
            setSource((v) => !v);
          }}
        >
          {source ? "Görsel düzenleyici" : "HTML"}
        </button>
      </div>
      {source ? (
        <textarea
          className="input mono rich-source-area"
          value={html}
          rows={24}
          onChange={(e) => {
            setHtml(e.target.value);
            onChange(e.target.value);
          }}
        />
      ) : (
        <div
          ref={ref}
          className="rich-area blog-prose"
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          onPaste={(e) => {
            // Word/Docs yapıştırmalarında stil çöpü gelmesin: düz metin veya temel HTML
            const htmlData = e.clipboardData.getData("text/html");
            if (!htmlData) return;
            e.preventDefault();
            const cleaned = htmlData
              .replace(/<!--[\s\S]*?-->/g, "")
              .replace(/<(style|script|meta|link|title)[\s\S]*?(<\/\1>|>)/gi, "")
              .replace(/\s(style|class|id|lang|dir|data-[\w-]+)="[^"]*"/gi, "")
              .replace(/<\/?(span|font|o:p)[^>]*>/gi, "");
            document.execCommand("insertHTML", false, cleaned);
            sync();
          }}
          onDrop={async (e) => {
            const f = e.dataTransfer.files?.[0];
            if (!f || !f.type.startsWith("image/")) return;
            e.preventDefault();
            setBusy(true);
            try {
              const url = await uploadImage(f, slugHint);
              const alt = window.prompt("Görsel açıklaması (alt metin — SEO için önemli):", "") ?? "";
              insertHtml(`<figure><img src="${absolutize(url)}" alt="${alt.replace(/"/g, "&quot;")}"><figcaption>${alt}</figcaption></figure><p></p>`);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          data-placeholder="Yazınızı buraya yazın veya yapıştırın. Başlıklar için H2/H3 kullanın."
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setError("");
          try {
            const url = await uploadImage(f, slugHint);
            const alt = window.prompt("Görsel açıklaması (alt metin — SEO için önemli):", "") ?? "";
            insertHtml(`<figure><img src="${absolutize(url)}" alt="${alt.replace(/"/g, "&quot;")}"><figcaption>${alt}</figcaption></figure><p></p>`);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <textarea name={name} value={html} readOnly hidden />
      {error ? <small className="field-error">{error}</small> : null}
    </div>
  );
}

export type BlogEditorDefaults = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  coverUrl: string;
  coverAlt: string;
  ogImageUrl: string;
};

type Check = { ok: boolean; label: string; hint?: string };

function seoChecks(input: {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keyword: string;
  text: string;
  html: string;
  coverUrl: string;
  coverAlt: string;
}): Check[] {
  const kw = input.keyword.trim().toLocaleLowerCase("tr-TR");
  const words = input.text ? input.text.split(" ").length : 0;
  const lower = input.text.toLocaleLowerCase("tr-TR");
  const effectiveTitle = (input.metaTitle || input.title).toLocaleLowerCase("tr-TR");
  const first = lower.split(" ").slice(0, 120).join(" ");
  const count = kw ? lower.split(kw).length - 1 : 0;
  const density = kw && words ? (count * kw.split(" ").length * 100) / words : 0;
  const h2 = (input.html.match(/<h2[\s>]/gi) ?? []).length;
  const internal = (input.html.match(/href="(\/(?!\/)|https?:\/\/[^"]*guntan)/gi) ?? []).length;
  const imgs = input.html.match(/<img\b[^>]*>/gi) ?? [];
  const noAlt = imgs.filter((t) => !/\salt="[^"]+"/.test(t)).length;
  const checks: Check[] = [
    { ok: words >= 600, label: `İçerik uzunluğu: ${words} kelime`, hint: "Rekabetçi konular için 600–1500+ kelime hedefleyin." },
    { ok: h2 >= 2, label: `Ara başlık (H2): ${h2}`, hint: "Konuyu en az 2–3 H2 başlıkla bölün; içindekiler tablosu bunlardan oluşur." },
    { ok: internal >= 2, label: `İç bağlantı: ${internal}`, hint: "İlgili kategori ve ürün sayfalarına en az 2 bağlantı verin." },
    { ok: imgs.length > 0 && noAlt === 0, label: imgs.length ? `Görsel alt metni: ${imgs.length - noAlt}/${imgs.length}` : "Gövdede görsel yok", hint: "Her görsele açıklayıcı alt metin yazın." },
    { ok: Boolean(input.coverUrl && input.coverAlt), label: "Kapak görseli ve alt metni", hint: "Kapak, Google Discover ve sosyal paylaşımda kullanılır (en az 1200 px genişlik)." },
    {
      ok: (input.metaTitle || input.title).trim().length >= SEO_LIMITS.title.min && (input.metaTitle || input.title).trim().length <= SEO_LIMITS.title.max,
      label: "Başlık uzunluğu 30–60 karakter",
    },
    {
      ok: input.metaDescription.trim().length >= SEO_LIMITS.description.min && input.metaDescription.trim().length <= SEO_LIMITS.description.max,
      label: "Meta açıklama 120–160 karakter",
    },
  ];
  if (kw) {
    const kwSlug = toSlug(kw);
    checks.unshift(
      { ok: effectiveTitle.includes(kw), label: "Anahtar kelime başlıkta", hint: "Mümkünse başlığın başına yakın kullanın." },
      { ok: input.metaDescription.toLocaleLowerCase("tr-TR").includes(kw), label: "Anahtar kelime meta açıklamada" },
      { ok: Boolean(kwSlug) && input.slug.includes(kwSlug), label: "Anahtar kelime adreste (slug)" },
      { ok: first.includes(kw), label: "Anahtar kelime ilk paragrafta" },
      { ok: new RegExp(`<h[23][^>]*>[^<]*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(input.html), label: "Anahtar kelime bir ara başlıkta" },
      { ok: density >= 0.5 && density <= 2.5, label: `Anahtar kelime yoğunluğu %${density.toFixed(1)} (${count} kez)`, hint: "%0,5–2,5 arası doğal kullanım idealdir; aşırı tekrar zarar verir." },
    );
  } else {
    checks.unshift({ ok: false, label: "Odak anahtar kelime girilmedi", hint: "Bu yazının hedeflediği aramayı yazın (örn. “fren balatası ne zaman değişir”)." });
  }
  return checks;
}

/** Yazı başlığı, adres, zengin gövde ve canlı SEO analizi. */
export function BlogEditor({
  defaults,
  siteName,
  host,
  assetBase,
  slugLocked,
}: {
  defaults: BlogEditorDefaults;
  siteName: string;
  host: string;
  assetBase: string;
  slugLocked: boolean;
}) {
  const [title, setTitle] = useState(defaults.title);
  const [slug, setSlug] = useState(defaults.slug);
  const [slugTouched, setSlugTouched] = useState(slugLocked || Boolean(defaults.slug));
  const [excerpt, setExcerpt] = useState(defaults.excerpt);
  const [html, setHtml] = useState(defaults.body);
  const [metaTitle, setMetaTitle] = useState(defaults.metaTitle);
  const [metaDescription, setMetaDescription] = useState(defaults.metaDescription);
  const [keyword, setKeyword] = useState(defaults.focusKeyword);
  const [coverUrl, setCoverUrl] = useState(defaults.coverUrl);
  const [coverAlt, setCoverAlt] = useState(defaults.coverAlt);
  const [text, setText] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setText(plain(html)), 250);
    return () => window.clearTimeout(t);
  }, [html]);

  const effectiveSlug = slugTouched ? toSlug(slug) : toSlug(title);
  const checks = useMemo(
    () => seoChecks({ title, metaTitle, metaDescription: metaDescription || excerpt, slug: effectiveSlug, keyword, text, html, coverUrl, coverAlt }),
    [title, metaTitle, metaDescription, excerpt, effectiveSlug, keyword, text, html, coverUrl, coverAlt],
  );
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const words = text ? text.split(" ").length : 0;
  const serpTitle = clip(`${metaTitle || title || "Yazı başlığı"} | ${siteName}`, 62);
  const serpDesc = clip(metaDescription || excerpt || text || "Meta açıklama girilmezse yazının özeti kullanılır.", 158);

  return (
    <div className="blog-editor">
      <div className="form-stack">
        <div className="field">
          <div className="field-top">
            <label htmlFor="bf-title">Başlık (H1)</label>
            <Counter value={title} min={20} max={70} />
          </div>
          <input className="input input-lg" id="bf-title" name="title" required maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. Fren balatası ne zaman değişir? 7 belirti" />
        </div>
        <div className="field">
          <label htmlFor="bf-slug">Adres (slug)</label>
          <div className="input-prefix">
            <span>/blog/</span>
            <input
              className="input mono"
              id="bf-slug"
              name="slug"
              value={slugTouched ? slug : effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="baslikten-otomatik"
            />
          </div>
          <small className="field-hint">
            Kısa, anahtar kelimeli ve tireli olsun. {slugLocked ? <strong>Yayındaki yazının adresini değiştirirseniz eski adres 404 olur; gerekirse yönlendirme ekleyin.</strong> : null}
          </small>
        </div>
        <div className="field">
          <div className="field-top">
            <label htmlFor="bf-excerpt">Özet</label>
            <Counter value={excerpt} min={80} max={300} />
          </div>
          <textarea className="input" id="bf-excerpt" name="excerpt" rows={3} maxLength={600} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Liste sayfalarında ve meta açıklama boşsa arama sonuçlarında görünür." />
        </div>
        <div className="field">
          <label>İçerik</label>
          <RichEditor name="body" defaultValue={defaults.body} assetBase={assetBase} slugHint={effectiveSlug} onChange={setHtml} />
          <small className="field-hint">
            {words} kelime · ~{Math.max(1, Math.round(words / 200))} dk okuma. Görselleri sürükleyip bırakabilirsiniz. Sayfa başlığı zaten H1'dir; gövdede H2'den başlayın.
          </small>
        </div>

        <fieldset className="fieldset">
          <legend>Görseller</legend>
          <div className="form-row">
            <ImageField
              name="coverUrl"
              label="Kapak görseli"
              defaultValue={defaults.coverUrl}
              assetBase={assetBase}
              slugHint={effectiveSlug}
              onChange={setCoverUrl}
              hint="Önerilen 1200×675 (16:9), WEBP/JPG, en fazla 3 MB."
            />
            <div className="field">
              <label htmlFor="bf-coverAlt">Kapak alt metni</label>
              <input className="input" id="bf-coverAlt" name="coverAlt" maxLength={255} value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} placeholder="Görselde ne olduğunu anlatın" />
            </div>
          </div>
          <ImageField name="ogImageUrl" label="Sosyal paylaşım görseli (OG, isteğe bağlı)" defaultValue={defaults.ogImageUrl} assetBase={assetBase} slugHint={`${effectiveSlug}-og`} hint="Boşsa kapak görseli kullanılır. 1200×630 önerilir." />
        </fieldset>

        <fieldset className="fieldset">
          <legend>Arama motoru (SEO)</legend>
          <div className="field">
            <label htmlFor="bf-kw">Odak anahtar kelime</label>
            <input className="input" id="bf-kw" name="focusKeyword" maxLength={191} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Örn. fren balatası değişimi" />
          </div>
          <div className="field">
            <div className="field-top">
              <label htmlFor="bf-mt">Meta başlık</label>
              <Counter value={metaTitle || title} min={SEO_LIMITS.title.min} max={SEO_LIMITS.title.max} />
            </div>
            <input className="input" id="bf-mt" name="metaTitle" maxLength={255} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Boşsa yazı başlığı kullanılır" />
            <small className="field-hint">Site adı otomatik eklenir (“… | {siteName}”).</small>
          </div>
          <div className="field">
            <div className="field-top">
              <label htmlFor="bf-md">Meta açıklama</label>
              <Counter value={metaDescription || excerpt} min={SEO_LIMITS.description.min} max={SEO_LIMITS.description.max} />
            </div>
            <textarea className="input" id="bf-md" name="metaDescription" rows={3} maxLength={500} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Boşsa özet kullanılır" />
          </div>
          <div className="serp" aria-label="Google önizlemesi">
            <div className="serp-site">
              <span className="serp-fav" aria-hidden>
                {siteName.slice(0, 1)}
              </span>
              <div>
                <strong>{siteName}</strong>
                <span>
                  {host} › blog › {effectiveSlug || "yazi-adresi"}
                </span>
              </div>
            </div>
            <h3>{serpTitle}</h3>
            <p>{serpDesc}</p>
          </div>
        </fieldset>
      </div>

      <aside className="blog-seo-side">
        <div className="blog-seo-score">
          <span className={`score-ring is-${score >= 80 ? "ok" : score >= 50 ? "warn" : "bad"}`} style={{ width: 56, height: 56, ["--p" as string]: `${score}` }} role="img" aria-label={`SEO puanı ${score}/100`}>
            <b>{score}</b>
          </span>
          <div>
            <strong>SEO analizi</strong>
            <small className="muted">Yazarken güncellenir</small>
          </div>
        </div>
        <ul className="seo-checks">
          {[...checks].sort((a, b) => Number(a.ok) - Number(b.ok)).map((c) => (
            <li key={c.label} className={c.ok ? "is-ok" : "is-todo"}>
              <span className="seo-check-ico" aria-hidden>
                {c.ok ? <IconCheck /> : <IconAlert />}
              </span>
              <div>
                <strong>{c.label}</strong>
                {!c.ok && c.hint ? <small>{c.hint}</small> : null}
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

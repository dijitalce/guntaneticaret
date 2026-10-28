export type PlanArticle = {
  /** Odak anahtar kelime: başlıkta ve adreste (slug) aynen geçen küçük harfli ifade. */
  kw: string;
  /** 120–160 karakter, odak kelimeyi içerir. */
  meta: string;
  /** Odak kelimeyle başlayan ya da onu içeren giriş paragrafı. */
  intro: string;
  /** [ara başlık, paragraf]; en az bir başlık odak kelimeyi içerir. */
  sections: [string, string][];
  faq: [string, string][];
  /** Başlık 60 karakteri aşıyorsa kısaltılmış SEO başlığı. */
  metaTitle?: string;
};

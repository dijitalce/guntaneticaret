export const CONSENT_COOKIE = "gt_consent";
/** Politika metni veya kategoriler değişince artırılır; eski onaylar geçersiz sayılır ve bant yeniden çıkar. */
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
export const CONSENT_EVENT = "gt-consent-change";
export const OPEN_CONSENT_EVENT = "gt-open-cookie-settings";

export type ConsentCategory = "analytics" | "marketing";
export type Consent = { analytics: boolean; marketing: boolean; at: number };

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  const m = /^v(\d+)\.a([01])\.m([01])\.(\d+)$/.exec(decodeURIComponent(raw));
  if (!m || Number(m[1]) !== CONSENT_VERSION) return null;
  return { analytics: m[2] === "1", marketing: m[3] === "1", at: Number(m[4]) };
}

export function serializeConsent(c: Consent) {
  return `v${CONSENT_VERSION}.a${c.analytics ? 1 : 0}.m${c.marketing ? 1 : 0}.${c.at}`;
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((p) => p.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

export function readConsent(): Consent | null {
  return parseConsent(readCookie(CONSENT_COOKIE));
}

export function hasConsent(category: ConsentCategory) {
  return readConsent()?.[category] === true;
}

const ANALYTICS_COOKIES = [/^_ga/, /^_gid$/, /^_gat/, /^gt_sid$/];
const MARKETING_COOKIES = [/^_fbp$/, /^_fbc$/, /^_ttp$/, /^_gcl_/, /^_tt_/, /^ttcsid/];

function clearCookies(patterns: RegExp[]) {
  const names = document.cookie.split("; ").map((p) => p.split("=")[0]!);
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of names) {
    if (!patterns.some((re) => re.test(name))) continue;
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

/** Kaydeder ve dinleyicilere haber verir. Daha önce verilmiş izin geri alındıysa ilgili çerezler silinir ve sayfa yenilenir (yüklenmiş betikler başka türlü durmaz). */
export function saveConsent(next: { analytics: boolean; marketing: boolean }) {
  const prev = readConsent();
  const value: Consent = { ...next, at: Math.floor(Date.now() / 1000) };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(value)}; Max-Age=${CONSENT_MAX_AGE}; path=/; SameSite=Lax${secure}`;
  const revokedAnalytics = prev?.analytics && !next.analytics;
  const revokedMarketing = prev?.marketing && !next.marketing;
  if (!next.analytics) clearCookies(ANALYTICS_COOKIES);
  if (!next.marketing) clearCookies(MARKETING_COOKIES);
  if (revokedAnalytics || revokedMarketing) {
    location.reload();
    return;
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

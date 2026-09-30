import { createHash, timingSafeEqual } from "node:crypto";

export type GarantiMode = "TEST" | "PROD";

export type GarantiConfig = {
  mode: GarantiMode;
  merchantId: string;
  terminalId: string;
  provUserId: string;
  provPassword: string;
  storeKey: string;
  companyName: string;
  /** taksit sayısı → vade farkı yüzdesi (ör. 3 → 4.5) */
  installments: Map<number, number>;
  /** Taksit seçeneği için sepet alt sınırı (TL). */
  installmentMinAmount: number;
};

const GATEWAY = {
  TEST: "https://sanalposprovtest.garantibbva.com.tr/servlet/gt3dengine",
  PROD: "https://sanalposprov.garanti.com.tr/servlet/gt3dengine",
} as const;

const CURRENCY_TRY = "949";
const TXN_TYPE = "sales";

/** "2:3.5,3:4.9,6:8.9" → Map { 2 → 3.5, 3 → 4.9, 6 → 8.9 } */
export function parseInstallments(raw: string | undefined): Map<number, number> {
  const out = new Map<number, number>();
  for (const part of (raw ?? "").split(",")) {
    const [n, rate] = part.split(":").map((s) => s.trim());
    const count = Number(n);
    const pct = Number(rate ?? "0");
    if (Number.isInteger(count) && count >= 2 && count <= 12 && Number.isFinite(pct) && pct >= 0) {
      out.set(count, pct);
    }
  }
  return new Map([...out].sort((a, b) => a[0] - b[0]));
}

export function garantiConfigFromEnv(env: NodeJS.ProcessEnv = process.env): GarantiConfig | null {
  const merchantId = env.GARANTI_MERCHANT_ID?.trim();
  const terminalId = env.GARANTI_TERMINAL_ID?.trim();
  const provPassword = env.GARANTI_PROV_PASSWORD;
  const storeKey = env.GARANTI_STORE_KEY;
  if (!merchantId || !terminalId || !provPassword || !storeKey) return null;
  return {
    mode: env.GARANTI_MODE?.trim().toUpperCase() === "PROD" ? "PROD" : "TEST",
    merchantId,
    terminalId,
    provUserId: env.GARANTI_PROV_USER_ID?.trim() || "PROVAUT",
    provPassword,
    storeKey,
    companyName: env.GARANTI_COMPANY_NAME?.trim() || "Guntan Oto Yedek Parca",
    installments: parseInstallments(env.GARANTI_INSTALLMENTS),
    installmentMinAmount: Number(env.GARANTI_INSTALLMENT_MIN_AMOUNT ?? "0") || 0,
  };
}

export function garantiGatewayUrl(config: GarantiConfig): string {
  return GATEWAY[config.mode];
}

function sha1Upper(s: string) {
  return createHash("sha1").update(s, "utf8").digest("hex").toUpperCase();
}

function sha512Upper(s: string) {
  return createHash("sha512").update(s, "utf8").digest("hex").toUpperCase();
}

/** TL tutarını Garanti'nin beklediği kuruş cinsinden tam sayıya çevirir: 1234.5 → "123450" */
export function toKurus(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n) || n <= 0) throw new Error("Geçersiz tutar.");
  return String(Math.round(n * 100));
}

/** Vade farkı eklenmiş, kuruşa yuvarlanmış tutar. */
export function amountWithInstallment(total: number, count: number, config: Pick<GarantiConfig, "installments">): number {
  if (count <= 1) return Math.round(total * 100) / 100;
  const pct = config.installments.get(count);
  if (pct === undefined) throw new Error("Geçersiz taksit.");
  return Math.round(total * (1 + pct / 100) * 100) / 100;
}

export function installmentOptions(total: number, config: GarantiConfig) {
  const options = [{ count: 1, total: Math.round(total * 100) / 100, monthly: Math.round(total * 100) / 100, ratePct: 0 }];
  if (total < config.installmentMinAmount) return options;
  for (const [count, ratePct] of config.installments) {
    const t = amountWithInstallment(total, count, config);
    options.push({ count, total: t, monthly: Math.round((t / count) * 100) / 100, ratePct });
  }
  return options;
}

function securityData(config: GarantiConfig) {
  return sha1Upper(config.provPassword + config.terminalId.padStart(9, "0"));
}

export function secure3dHash(
  config: GarantiConfig,
  p: { orderId: string; amountKurus: string; successUrl: string; errorUrl: string; installment: string },
) {
  return sha512Upper(
    config.terminalId +
      p.orderId +
      p.amountKurus +
      CURRENCY_TRY +
      p.successUrl +
      p.errorUrl +
      TXN_TYPE +
      p.installment +
      config.storeKey +
      securityData(config),
  );
}

/** Bankanın 3D ortak ödeme sayfasına otomatik gönderilecek form alanları. */
export function buildOosPayForm(
  config: GarantiConfig,
  input: {
    orderId: string;
    amount: number;
    installment: number;
    email: string;
    customerIp: string;
    successUrl: string;
    errorUrl: string;
    now?: Date;
  },
): { action: string; fields: Record<string, string> } {
  const amountKurus = toKurus(input.amount);
  const installment = input.installment > 1 ? String(input.installment) : "";
  const fields: Record<string, string> = {
    mode: config.mode,
    apiversion: "512",
    secure3dsecuritylevel: "OOS_PAY",
    terminalprovuserid: config.provUserId,
    terminaluserid: config.provUserId,
    terminalmerchantid: config.merchantId,
    terminalid: config.terminalId,
    orderid: input.orderId,
    customeremailaddress: input.email,
    customeripaddress: input.customerIp,
    txntype: TXN_TYPE,
    txnamount: amountKurus,
    txncurrencycode: CURRENCY_TRY,
    txninstallmentcount: installment,
    successurl: input.successUrl,
    errorurl: input.errorUrl,
    companyname: config.companyName,
    lang: "tr",
    refreshtime: "0",
    txntimestamp: (input.now ?? new Date()).toISOString(),
  };
  fields.secure3dhash = secure3dHash(config, {
    orderId: input.orderId,
    amountKurus,
    successUrl: input.successUrl,
    errorUrl: input.errorUrl,
    installment,
  });
  return { action: garantiGatewayUrl(config), fields };
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Bankanın dönüş POST'unda `hashparams` ile listelenen alanların değerleri + store key'in özeti `hash` ile eşleşmeli.
 * Garanti OOS_PAY bunu SHA-1/base64 gönderiyor; `txnamount` imzalı alanlar arasında değil.
 */
export function verifyCallbackHash(config: GarantiConfig, data: Record<string, string>): boolean {
  const hash = data.hash ?? data.HASH;
  const hashParams = data.hashparams ?? data.HASHPARAMS;
  if (!hash || !hashParams) return false;
  const values = hashParams
    .split(":")
    .filter(Boolean)
    .map((k) => data[k] ?? data[k.toLowerCase()] ?? "")
    .join("");
  const plain = values + config.storeKey;
  const candidates = [
    createHash("sha1").update(plain, "utf8").digest("base64"),
    sha512Upper(plain),
    createHash("sha512").update(plain, "utf8").digest("base64"),
  ];
  return candidates.some((c) => safeEqual(hash, c));
}

export type GarantiResult =
  | { ok: true; orderId: string; amountKurus: string; installment: number; authCode: string; hostRef: string }
  /** verified=false: cevabın bankadan geldiği doğrulanamadı. */
  | { ok: false; verified: boolean; orderId: string; reason: string };

const MD_OK = new Set(["1", "2", "3", "4"]);

export function parseCallback(config: GarantiConfig, data: Record<string, string>): GarantiResult {
  // Sipariş yalnızca imzalı `oid` alanından okunur; `orderid` imzasızdır ve değiştirilebilir.
  const orderId = data.oid ?? "";
  const signedFields = (data.hashparams ?? "").split(":").map((k) => k.toLowerCase());
  if (!orderId || !signedFields.includes("oid") || !verifyCallbackHash(config, data)) {
    return { ok: false, verified: false, orderId, reason: "Banka cevabı doğrulanamadı." };
  }
  const md = data.mdstatus ?? "";
  const proc = data.procreturncode ?? "";
  if (!MD_OK.has(md)) {
    return { ok: false, verified: true, orderId, reason: data.mderrormessage || "3D Secure doğrulaması başarısız." };
  }
  if (proc !== "00") {
    return { ok: false, verified: true, orderId, reason: data.errmsg || data.response || "Ödeme onaylanmadı." };
  }
  return {
    ok: true,
    orderId,
    amountKurus: data.txnamount ?? "",
    installment: Number(data.txninstallmentcount || "1") || 1,
    authCode: data.authcode ?? "",
    hostRef: data.hostrefnum ?? "",
  };
}

/**
 * Aras Kargo entegrasyonu.
 *   - SetOrder (arascargoservice.asmx): gönderi kaydı; IntegrationCode = sipariş no.
 *   - GetQueryJSON (ArasCargoIntegrationService.svc): entegrasyon koduyla takip no ve durum.
 */

export type ArasMode = "TEST" | "PROD";

export type ArasConfig = {
  mode: ArasMode;
  /** SetOrder kullanıcı adı/şifresi */
  username: string;
  password: string;
  /** Takip sorgusu (GetQueryJSON) bilgileri; Aras ayrı hesap verebilir. */
  queryUsername: string;
  queryPassword: string;
  customerCode: string;
  /** 1 = gönderici öder, 2 = alıcı öder */
  payorTypeCode: "1" | "2";
  senderAddressId: string;
  orderUrl: string;
  queryUrl: string;
};

const ORDER_URL = {
  TEST: "https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx",
  PROD: "https://customerws.araskargo.com.tr/arascargoservice.asmx",
} as const;

const QUERY_URL = {
  TEST: "https://customerservicestest.araskargo.com.tr/ArasCargoIntegrationService.svc",
  PROD: "https://customerservices.araskargo.com.tr/ArasCargoCustomerIntegrationService/ArasCargoIntegrationService.svc",
} as const;

export function arasConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ArasConfig | null {
  const username = env.ARAS_USERNAME?.trim();
  const password = env.ARAS_PASSWORD;
  if (!username || !password) return null;
  const mode: ArasMode = env.ARAS_MODE?.trim().toUpperCase() === "PROD" ? "PROD" : "TEST";
  return {
    mode,
    username,
    password,
    queryUsername: env.ARAS_QUERY_USERNAME?.trim() || username,
    queryPassword: env.ARAS_QUERY_PASSWORD || password,
    customerCode: env.ARAS_CUSTOMER_CODE?.trim() || "",
    payorTypeCode: env.ARAS_PAYOR_TYPE === "2" ? "2" : "1",
    senderAddressId: env.ARAS_SENDER_ADDRESS_ID?.trim() || "",
    orderUrl: env.ARAS_ORDER_URL?.trim() || ORDER_URL[mode],
    queryUrl: env.ARAS_QUERY_URL?.trim() || QUERY_URL[mode],
  };
}

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlUnescape(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`));
  return m ? xmlUnescape(m[1]!) : undefined;
}

function el(name: string, value: string | number | undefined) {
  return `<${name}>${xmlEscape(String(value ?? ""))}</${name}>`;
}

/** "0 (532) 123 45 67" / "+90532..." → "5321234567" */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return d;
}

async function soap(url: string, action: string, body: string, timeoutMs = 20000): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body>${body}</soap:Body></soap:Envelope>`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "text/xml; charset=utf-8", SOAPAction: `"${action}"` },
    body: envelope,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    const fault = tag(text, "faultstring");
    throw new Error(`Aras servis hatası (HTTP ${res.status})${fault ? `: ${fault}` : ""}`);
  }
  return text;
}

export type ArasShipmentInput = {
  integrationCode: string;
  receiverName: string;
  receiverAddress: string;
  receiverPhone: string;
  receiverCity: string;
  receiverTown: string;
  pieceCount?: number;
  weightKg?: number;
  description?: string;
};

export type ArasOrderResult = { ok: boolean; code: string; message: string; invoiceKey?: string };

export function buildSetOrderBody(config: ArasConfig, input: ArasShipmentInput): string {
  const pieces = Math.max(1, Math.floor(input.pieceCount ?? 1));
  const weight = String(input.weightKg ?? 1);
  const pieceXml = Array.from({ length: pieces }, (_, i) =>
    [
      "<PieceDetail>",
      el("VolumetricWeight", weight),
      el("Weight", weight),
      el("BarcodeNumber", pieces === 1 ? input.integrationCode : `${input.integrationCode}-${i + 1}`),
      el("ProductNumber", ""),
      el("Description", input.description ?? ""),
      "</PieceDetail>",
    ].join(""),
  ).join("");
  return [
    '<SetOrder xmlns="http://tempuri.org/"><orderInfo><Order>',
    el("UserName", config.username),
    el("Password", config.password),
    el("TradingWaybillNumber", input.integrationCode),
    el("InvoiceNumber", input.integrationCode),
    el("IntegrationCode", input.integrationCode),
    el("ReceiverName", input.receiverName),
    el("ReceiverAddress", input.receiverAddress),
    el("ReceiverPhone1", normalizePhone(input.receiverPhone)),
    el("ReceiverCityName", input.receiverCity),
    el("ReceiverTownName", input.receiverTown),
    el("VolumetricWeight", weight),
    el("Weight", weight),
    el("PieceCount", pieces),
    el("Description", input.description ?? ""),
    el("PayorTypeCode", config.payorTypeCode),
    el("IsWorldWide", "0"),
    el("IsCod", "0"),
    config.senderAddressId ? el("SenderAccountAddressId", config.senderAddressId) : "",
    `<PieceDetails>${pieceXml}</PieceDetails>`,
    "</Order></orderInfo>",
    el("userName", config.username),
    el("password", config.password),
    "</SetOrder>",
  ].join("");
}

export async function createArasOrder(config: ArasConfig, input: ArasShipmentInput): Promise<ArasOrderResult> {
  const xml = await soap(config.orderUrl, "http://tempuri.org/SetOrder", buildSetOrderBody(config, input));
  const code = tag(xml, "ResultCode") ?? "";
  const message = tag(xml, "ResultMessage") ?? "";
  // Aynı IntegrationCode ile tekrar gönderimde Aras "zaten kayıtlı" döner; kayıt mevcut sayılır.
  const duplicate = /mevcut|kay[ıi]tl[ıi]|already/i.test(message) && code !== "0";
  return { ok: code === "0" || duplicate, code, message, invoiceKey: tag(xml, "InvoiceKey") };
}

export type ArasTracking = {
  found: boolean;
  trackingNo: string;
  statusCode: string;
  statusText: string;
  delivered: boolean;
  raw?: unknown;
};

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) return firstRecord(value[0]);
  const obj = value as Record<string, unknown>;
  if ("KARGO_TAKIP_NO" in obj || "DURUMU" in obj || "DURUM_KODU" in obj) return obj;
  for (const v of Object.values(obj)) {
    const found = firstRecord(v);
    if (found) return found;
  }
  return null;
}

export function parseTrackingJson(json: string): ArasTracking {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { found: false, trackingNo: "", statusCode: "", statusText: "", delivered: false };
  }
  const rec = firstRecord(data);
  if (!rec) return { found: false, trackingNo: "", statusCode: "", statusText: "", delivered: false, raw: data };
  const statusCode = pick(rec, ["DURUM_KODU", "DURUMKODU"]);
  const statusText = pick(rec, ["DURUMU", "DURUM", "SON_DURUM"]);
  const delivered = statusCode === "6" || /TESL[İI]M ED[İI]LD[İI]/i.test(statusText.toLocaleUpperCase("tr-TR"));
  return {
    found: true,
    trackingNo: pick(rec, ["KARGO_TAKIP_NO", "KARGOTAKIPNO", "TAKIP_NO"]),
    statusCode,
    statusText,
    delivered,
    raw: rec,
  };
}

/** QueryType 1: entegrasyon koduyla gönderi bilgisi. */
export async function queryArasByIntegrationCode(config: ArasConfig, integrationCode: string): Promise<ArasTracking> {
  const login = `<LoginInfo>${el("UserName", config.queryUsername)}${el("Password", config.queryPassword)}${el("CustomerCode", config.customerCode)}</LoginInfo>`;
  const query = `<QueryInfo>${el("QueryType", "1")}${el("IntegrationCode", integrationCode)}</QueryInfo>`;
  const body = `<GetQueryJSON xmlns="http://tempuri.org/">${el("loginInfo", login)}${el("queryInfo", query)}</GetQueryJSON>`;
  const xml = await soap(config.queryUrl, "http://tempuri.org/IArasCargoIntegrationService/GetQueryJSON", body);
  return parseTrackingJson(tag(xml, "GetQueryJSONResult") ?? "");
}

export function arasTrackingUrl(trackingNo: string): string {
  return `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${encodeURIComponent(trackingNo)}`;
}

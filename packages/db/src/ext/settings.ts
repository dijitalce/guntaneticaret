import { getAppSetting, setAppSetting } from "../app-settings";

export type NotifySettings = {
  emailProvider: "none" | "resend" | "brevo";
  emailApiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  adminEmails: string;
  smsProvider: "none" | "netgsm";
  netgsmUser: string;
  netgsmPass: string;
  netgsmHeader: string;
};

export const DEFAULT_NOTIFY: NotifySettings = {
  emailProvider: "none",
  emailApiKey: "",
  fromEmail: "",
  fromName: "",
  replyTo: "",
  adminEmails: "",
  smsProvider: "none",
  netgsmUser: "",
  netgsmPass: "",
  netgsmHeader: "",
};

export type AutomationKey =
  | "abandoned_cart"
  | "review_request"
  | "low_stock"
  | "back_in_stock"
  | "bank_reminder"
  | "bank_cancel";

export type AutomationSettings = {
  abandoned_cart: {
    enabled: boolean;
    delayMinutes: number;
    secondEnabled: boolean;
    secondDelayHours: number;
    couponCode: string;
    sms: boolean;
  };
  review_request: { enabled: boolean; afterDays: number };
  low_stock: { enabled: boolean; threshold: number; emails: string };
  back_in_stock: { enabled: boolean };
  bank_reminder: { enabled: boolean; afterHours: number; sms: boolean };
  bank_cancel: { enabled: boolean; afterHours: number };
};

export const DEFAULT_AUTOMATIONS: AutomationSettings = {
  abandoned_cart: { enabled: false, delayMinutes: 60, secondEnabled: false, secondDelayHours: 24, couponCode: "", sms: false },
  review_request: { enabled: false, afterDays: 3 },
  low_stock: { enabled: false, threshold: 2, emails: "" },
  back_in_stock: { enabled: true },
  bank_reminder: { enabled: false, afterHours: 12, sms: false },
  bank_cancel: { enabled: false, afterHours: 72 },
};

export type ShippingSettings = {
  defaultCarrier: "aras" | "manual";
  flatFee: number;
  freeShippingThreshold: number;
  defaultWeightKg: number;
  defaultPieces: number;
  estimatedDays: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  senderDistrict: string;
  labelSize: "100x150" | "100x100" | "a4";
  labelShowPrice: boolean;
  labelShowItems: boolean;
  labelNote: string;
};

export const DEFAULT_SHIPPING: ShippingSettings = {
  defaultCarrier: "aras",
  flatFee: 99.9,
  freeShippingThreshold: 0,
  defaultWeightKg: 1,
  defaultPieces: 1,
  estimatedDays: "1-3 iş günü",
  senderName: "",
  senderPhone: "",
  senderAddress: "",
  senderCity: "",
  senderDistrict: "",
  labelSize: "100x150",
  labelShowPrice: false,
  labelShowItems: true,
  labelNote: "",
};

export type MarketingSettings = {
  attribution: "click" | "open";
  attributionDays: number;
  frequencyHours: number;
  smsQuietStart: number;
  smsQuietEnd: number;
};

export const DEFAULT_MARKETING: MarketingSettings = {
  attribution: "click",
  attributionDays: 5,
  frequencyHours: 24,
  smsQuietStart: 21,
  smsQuietEnd: 9,
};

export type IntegrationSecrets = {
  metaCapiToken: string;
  metaTestCode: string;
  ga4ApiSecret: string;
};

export const DEFAULT_SECRETS: IntegrationSecrets = { metaCapiToken: "", metaTestCode: "", ga4ApiSecret: "" };

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 30_000;

async function load<T extends object>(key: string, defaults: T): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const stored = await getAppSetting<Partial<T>>(key).catch(() => null);
  const value = mergeDeep(defaults, stored?.value ?? {});
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function save(key: string, value: unknown) {
  await setAppSetting(key, value);
  cache.delete(key);
}

function mergeDeep<T extends object>(defaults: T, stored: Partial<T>): T {
  const out = { ...defaults } as Record<string, unknown>;
  for (const [k, v] of Object.entries(stored ?? {})) {
    const base = out[k];
    if (base && typeof base === "object" && !Array.isArray(base) && v && typeof v === "object") {
      out[k] = { ...(base as object), ...(v as object) };
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export const getNotifySettings = () => load("notify.settings", DEFAULT_NOTIFY);
export const saveNotifySettings = (v: NotifySettings) => save("notify.settings", v);
export const getAutomationSettings = () => load("automations", DEFAULT_AUTOMATIONS);
export const saveAutomationSettings = (v: AutomationSettings) => save("automations", v);
export const getShippingSettings = () => load("shipping.settings", DEFAULT_SHIPPING);
export const saveShippingSettings = (v: ShippingSettings) => save("shipping.settings", v);
export const getMarketingSettings = () => load("marketing.settings", DEFAULT_MARKETING);
export const saveMarketingSettings = (v: MarketingSettings) => save("marketing.settings", v);
export const getIntegrationSecrets = (tenantId: string) => load(`integrations.secret.${tenantId}`, DEFAULT_SECRETS);
export const saveIntegrationSecrets = (tenantId: string, v: IntegrationSecrets) => save(`integrations.secret.${tenantId}`, v);

export type FeedSecret = { username: string; password: string; headerName: string; headerValue: string };
export const DEFAULT_FEED_SECRET: FeedSecret = { username: "", password: "", headerName: "", headerValue: "" };
export const getFeedSecret = (feedId: string) => load(`xmlfeed.secret.${feedId}`, DEFAULT_FEED_SECRET);
export const saveFeedSecret = (feedId: string, v: FeedSecret) => save(`xmlfeed.secret.${feedId}`, v);

export type FeedProbe = {
  probedAt: string;
  ok: boolean;
  error?: string;
  itemTag?: string;
  itemCount?: number;
  bytes?: number;
  fields?: { path: string; samples: string[] }[];
  items?: Record<string, string>[];
};
export const getFeedProbe = (feedId: string) => load<Partial<FeedProbe>>(`xmlfeed.probe.${feedId}`, {});
export const saveFeedProbe = (feedId: string, v: FeedProbe) => save(`xmlfeed.probe.${feedId}`, v);

export type TemplateOverride = { email?: boolean; sms?: boolean; subject?: string; body?: string; smsBody?: string };
export const getTemplateOverrides = () => load<Record<string, TemplateOverride>>("notify.templates", {});
export const saveTemplateOverrides = (v: Record<string, TemplateOverride>) => save("notify.templates", v);

export type CustomSegment = {
  key: string;
  name: string;
  description?: string;
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  lastOrderWithinDays?: number;
  lastOrderOlderThanDays?: number;
  registeredWithinDays?: number;
  tenantId?: string;
  marketingOnly?: boolean;
  hasAbandonedCart?: boolean;
};
export const getCustomSegments = () => load<{ items: CustomSegment[] }>("marketing.segments", { items: [] });
export const saveCustomSegments = (items: CustomSegment[]) => save("marketing.segments", { items });

export function tagList(value: string, max = 20): string[] {
  const seen = new Set<string>();
  for (const raw of value.split(",")) {
    const t = raw.trim().slice(0, 40);
    if (t) seen.add(t);
  }
  return [...seen].slice(0, max);
}

export function csvList(value: string): string[] {
  return value
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

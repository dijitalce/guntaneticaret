import { eq } from "drizzle-orm";
import { db, saveFeedProbe, xmlFeeds, type FeedSecret } from "@guntan/db";
import {
  CUSTOM_FIELD_LABELS,
  assertSafeFeedUrl,
  feedRowMapping,
  guessCurrencyField,
  guessMapping,
  probeFeed,
  type CustomFeedConfig,
} from "@guntan/import";
import { text } from "./api-helpers";

export const SECRET_MASK = "••••••••";

export function connectionFromForm(form: FormData, cfg: CustomFeedConfig, current: FeedSecret) {
  const name = text(form, "name").slice(0, 120);
  const url = text(form, "url").slice(0, 2000);
  if (!name) return { error: "Kaynak adı zorunlu." } as const;
  try {
    assertSafeFeedUrl(url);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Geçersiz adres." } as const;
  }
  const auth = text(form, "auth");
  const keep = (key: string, value: string) => {
    const v = text(form, key);
    return v === SECRET_MASK ? value : v.slice(0, 500);
  };
  const next: CustomFeedConfig = {
    ...cfg,
    url,
    auth: auth === "basic" || auth === "header" ? auth : "none",
    itemTag: text(form, "itemTag").replace(/[^\w:.-]/g, "").slice(0, 80),
  };
  const secret: FeedSecret = {
    username: next.auth === "basic" ? text(form, "username").slice(0, 200) : "",
    password: next.auth === "basic" ? keep("password", current.password) : "",
    headerName: next.auth === "header" ? text(form, "headerName").replace(/[^\w-]/g, "").slice(0, 80) : "",
    headerValue: next.auth === "header" ? keep("headerValue", current.headerValue) : "",
  };
  return { name, cfg: next, secret };
}

/** Bağlanır, sonucu saklar; eşleştirme boşsa alanları tahmin eder. */
export async function probeAndStore(feedId: string, cfg: CustomFeedConfig, secret: FeedSecret) {
  const probe = await probeFeed(cfg, secret);
  await saveFeedProbe(feedId, probe);
  if (!probe.ok) return { ok: false as const, error: probe.error ?? "Bağlantı kurulamadı.", cfg };
  const paths = (probe.fields ?? []).map((f) => f.path);
  const next: CustomFeedConfig = { ...cfg, itemTag: probe.itemTag ?? cfg.itemTag };
  const hasMapping = CUSTOM_FIELD_LABELS.some((f) => cfg.mapping[f.key]);
  if (!hasMapping) {
    next.mapping = guessMapping(paths);
    const currencyField = guessCurrencyField(paths);
    if (currencyField) {
      next.currency = "field";
      next.currencyField = currencyField;
    }
  }
  await db.update(xmlFeeds).set({ mapping: feedRowMapping(next) }).where(eq(xmlFeeds.id, feedId));
  return { ok: true as const, cfg: next, count: probe.itemCount ?? 0 };
}

export function mappingIsComplete(cfg: CustomFeedConfig) {
  return Boolean(cfg.itemTag && cfg.mapping.name && cfg.mapping.price && (cfg.mapping.sku || cfg.mapping.externalId));
}

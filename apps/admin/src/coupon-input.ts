import { text } from "./api-helpers";

function dec(v: string) {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function couponFromForm(form: FormData) {
  const code = text(form, "code").toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,64}$/.test(code)) return { error: "Kupon kodu 3-64 karakter olmalı; harf, rakam, - ve _ kullanılabilir." } as const;
  const typeRaw = text(form, "type");
  const type = typeRaw === "fixed" || typeRaw === "free_shipping" ? typeRaw : "percent";
  const value = type === "free_shipping" ? 0 : dec(text(form, "value"));
  if (value === null || (type !== "free_shipping" && value <= 0)) return { error: "Geçerli bir indirim değeri girin." } as const;
  if (type === "percent" && value > 100) return { error: "Yüzde indirim 100'den büyük olamaz." } as const;
  const min = dec(text(form, "minSubtotal"));
  const start = text(form, "startsAt");
  const end = text(form, "endsAt");
  const limit = Math.round(Number(text(form, "usageLimit")));
  return {
    code,
    type,
    value: value.toFixed(2),
    minSubtotal: min ? min.toFixed(2) : null,
    isActive: form.get("isActive") === "1" ? 1 : 0,
    meta: {
      description: text(form, "description").slice(0, 255) || null,
      startsAt: start ? new Date(`${start}T00:00:00+03:00`) : null,
      endsAt: end ? new Date(`${end}T23:59:59+03:00`) : null,
      usageLimit: Number.isFinite(limit) && limit > 0 ? limit : null,
    },
  } as const;
}

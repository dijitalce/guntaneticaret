import { text } from "./api-helpers";

const THIS_YEAR = new Date().getFullYear();

function year(form: FormData, key: string): number | null | "invalid" {
  const raw = text(form, key);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n >= 1950 && n <= THIS_YEAR + 2 ? n : "invalid";
}

export function parseGenerationForm(form: FormData) {
  const code = text(form, "bodyCode").slice(0, 64);
  const yearFrom = year(form, "yearFrom");
  const yearTo = year(form, "yearTo");
  if (yearFrom === "invalid" || yearTo === "invalid") return { error: `Yıllar 1950–${THIS_YEAR + 2} arasında olmalı.` } as const;
  if (yearFrom && yearTo && yearTo < yearFrom) return { error: "Bitiş yılı başlangıç yılından önce olamaz." } as const;
  if (!code && !yearFrom) return { error: "Kasa kodu veya başlangıç yılı girin." } as const;
  const name = code || `${yearFrom}${yearTo ? `-${yearTo}` : ""}`;
  return {
    values: {
      name,
      bodyCode: code || null,
      yearFrom,
      yearTo,
      isActive: form.get("isActive") === "1",
    },
  } as const;
}

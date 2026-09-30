import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import {
  getRepriceJob,
  isRepriceRunning,
  loadAppliedPriceTiers,
  loadPriceTiers,
  normalizePriceTiers,
  runRepriceJob,
  sameTiers,
  savePriceTiers,
  toStoredTiers,
  type StoredPriceTier,
} from "@guntan/import";
import { writeAudit } from "@guntan/observability";
import { adminRedirect } from "../../../src/paths";

const PAGE = "/catalog/pricing";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(adminRedirect("/login", request), 303);

  const form = await request.formData();
  const applyNow = form.get("apply") === "now";
  const back = (query: string) => NextResponse.redirect(adminRedirect(`${PAGE}?${query}`, request), 303);

  let tiers;
  try {
    tiers = normalizePriceTiers(JSON.parse(String(form.get("tiers") ?? "[]")) as StoredPriceTier[]);
  } catch (err) {
    return back(`hata=${encodeURIComponent(err instanceof Error ? err.message : "Geçersiz dilimler.")}`);
  }

  const current = await loadPriceTiers();
  const applied = (await loadAppliedPriceTiers()) ?? current.tiers;

  if (applyNow && isRepriceRunning(await getRepriceJob())) {
    return back(`hata=${encodeURIComponent("Devam eden bir fiyat güncellemesi var; bitince tekrar deneyin.")}`);
  }

  if (!sameTiers(current.tiers, tiers) || current.isDefault) {
    await savePriceTiers(tiers, session.user.email);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "price_tiers",
      entityId: "global",
      action: "update",
      before: { tiers: toStoredTiers(current.tiers) },
      after: { tiers: toStoredTiers(tiers), applyNow },
    });
  }

  if (applyNow && !sameTiers(applied, tiers)) {
    // Uzun sürebilir; istek beklemeden arka planda çalışır, ilerleme sayfada izlenir.
    void runRepriceJob(applied, tiers, session.user.email).catch(() => undefined);
    return back("ok=basladi");
  }
  return back(applyNow ? "ok=guncel" : "ok=kaydedildi");
}

import { getCustomSegments, saveCustomSegments, type CustomSegment } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, slugify, text } from "../../../src/api-helpers";

function optNum(form: FormData, key: string) {
  const v = text(form, key).replace(",", ".");
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const back = "/marketing/segments";
  const { items } = await getCustomSegments();

  if (text(form, "_action") === "delete") {
    const key = text(form, "key");
    await saveCustomSegments(items.filter((s) => s.key !== key));
    await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "segment", entityId: key, action: "delete" });
    return redirectTo(request, back, { ok: "silindi" });
  }

  const name = text(form, "name").slice(0, 120);
  if (!name) return redirectTo(request, back, { hata: "Segment adını yazın." });
  const seg: CustomSegment = {
    key: `c_${slugify(name).slice(0, 40)}_${Date.now().toString(36).slice(-4)}`,
    name,
    description: text(form, "description").slice(0, 300) || undefined,
    minOrders: optNum(form, "minOrders"),
    maxOrders: optNum(form, "maxOrders"),
    minSpent: optNum(form, "minSpent"),
    lastOrderWithinDays: optNum(form, "lastOrderWithinDays"),
    lastOrderOlderThanDays: optNum(form, "lastOrderOlderThanDays"),
    registeredWithinDays: optNum(form, "registeredWithinDays"),
    tenantId: text(form, "tenantId") || undefined,
    hasAbandonedCart: form.get("hasAbandonedCart") === "1" || undefined,
  };
  await saveCustomSegments([...items, seg].slice(-50));
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "segment", entityId: seg.key, action: "create", after: seg });
  return redirectTo(request, back, { ok: "olusturuldu" });
}

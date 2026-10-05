import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { inArray } from "drizzle-orm";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { db, products } from "@guntan/db";
import { writeAudit } from "@guntan/observability";

const STATUSES = new Set(["active", "inactive", "draft"]);
const MAX_IDS = 500;

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.json({ error: "Oturum süresi doldu, yeniden giriş yapın." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { ids?: unknown; status?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((v): v is string => typeof v === "string").slice(0, MAX_IDS) : [];
  const status = typeof body?.status === "string" ? body.status : "";
  if (!ids.length || !STATUSES.has(status)) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  await db.update(products).set({ status, updatedAt: new Date() }).where(inArray(products.id, ids));
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "product",
    entityId: ids.length === 1 ? ids[0]! : `${ids.length} ürün`,
    action: "bulk_update",
    after: { status, ids },
  });
  return NextResponse.json({ updated: ids.length });
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { addStockAlert, db, products } from "@guntan/db";
import { isValidEmail, tenantFromRequest } from "../../../src/request-tenant";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { productId?: string; email?: string };
  const email = String(body.email ?? "").trim();
  const productId = String(body.productId ?? "");
  if (!isValidEmail(email) || !/^[a-f0-9-]{36}$/.test(productId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const tenant = await tenantFromRequest();
  if (!tenant) return NextResponse.json({ ok: false }, { status: 404 });
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return NextResponse.json({ ok: false }, { status: 404 });
  await addStockAlert({ tenantId: tenant.tenant.id, productId, email });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { getCustomerBySession } from "@guntan/auth";
import { customerAddresses, db } from "@guntan/db";

async function requireUser() {
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  return token ? getCustomerBySession(token) : null;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.redirect(publicRedirect("/hesabim", request), 303);

  const form = await request.formData();
  const title = String(form.get("title") ?? "Adres").trim() || "Adres";
  const fullName = String(form.get("fullName") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  const district = String(form.get("district") ?? "").trim();
  const line1 = String(form.get("line1") ?? "").trim();
  const postalCode = String(form.get("postalCode") ?? "").trim() || null;
  const isDefault = form.get("isDefault") === "1" ? 1 : 0;

  if (!fullName || !phone || !city || !district || !line1) {
    return NextResponse.redirect(publicRedirect("/hesabim/adresler?hata=1", request), 303);
  }

  if (isDefault) {
    await db
      .update(customerAddresses)
      .set({ isDefault: 0 })
      .where(eq(customerAddresses.customerId, user.id));
  }

  await db.insert(customerAddresses).values({
    customerId: user.id,
    title,
    fullName,
    phone,
    city,
    district,
    line1,
    postalCode,
    isDefault: isDefault || 0,
  });

  return NextResponse.redirect(publicRedirect("/hesabim/adresler?ok=1", request), 303);
}

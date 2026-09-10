import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { getCustomerBySession } from "@guntan/auth";
import { customerAddresses, db } from "@guntan/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  if (!user) return NextResponse.redirect(publicRedirect("/hesabim", request), 303);

  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  if (!id) return NextResponse.redirect(publicRedirect("/hesabim/adresler", request), 303);

  await db
    .update(customerAddresses)
    .set({ isDefault: 0 })
    .where(eq(customerAddresses.customerId, user.id));

  await db
    .update(customerAddresses)
    .set({ isDefault: 1 })
    .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, user.id)));

  return NextResponse.redirect(publicRedirect("/hesabim/adresler?ok=1", request), 303);
}

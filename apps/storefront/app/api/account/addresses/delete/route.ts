import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { getCustomerBySession } from "@guntan/auth";
import { customerAddresses, db } from "@guntan/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  if (!user) return NextResponse.redirect(new URL("/hesabim", request.url), 303);

  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  if (!id) return NextResponse.redirect(new URL("/hesabim/adresler", request.url), 303);

  await db
    .delete(customerAddresses)
    .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, user.id)));

  return NextResponse.redirect(new URL("/hesabim/adresler?ok=sil", request.url), 303);
}

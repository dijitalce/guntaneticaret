import { NextResponse } from "next/server";
import { publicRedirect } from "@guntan/config";
import { unsubscribeContact, verifyUnsubscribe } from "@guntan/db";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("e") ?? "");
  const key = String(form.get("k") ?? "");
  if (!email || !verifyUnsubscribe(email, key)) {
    return NextResponse.redirect(publicRedirect("/abonelik", request), 303);
  }
  await unsubscribeContact(email);
  return NextResponse.redirect(publicRedirect("/abonelik?tamam=1", request), 303);
}

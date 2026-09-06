import { cookies } from "next/headers";
import { COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { getCustomerBySession } from "@guntan/auth";

export async function getCurrentCustomer() {
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  if (!token) return null;
  return getCustomerBySession(token);
}

export async function getCurrentCustomerOrToken() {
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value ?? null;
  const user = token ? await getCustomerBySession(token) : null;
  return { user, token };
}

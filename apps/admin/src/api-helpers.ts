import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { adminRedirect } from "./paths";

export async function apiAdminSession() {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  return token ? await getAdminBySession(token) : null;
}

export function redirectTo(request: Request, path: string, query?: Record<string, string>) {
  const qs = query ? new URLSearchParams(query).toString() : "";
  const hashAt = path.indexOf("#");
  const base = hashAt >= 0 ? path.slice(0, hashAt) : path;
  const hash = hashAt >= 0 ? path.slice(hashAt) : "";
  const sep = base.includes("?") ? "&" : "?";
  return NextResponse.redirect(adminRedirect(`${qs ? `${base}${sep}${qs}` : base}${hash}`, request), 303);
}

/** Sadece panel içi göreli yollara yönlendir. */
export function safeNext(value: FormDataEntryValue | null, fallback: string) {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

export function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isDuplicateError(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "ER_DUP_ENTRY" || e?.cause?.code === "ER_DUP_ENTRY";
}

export function text(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

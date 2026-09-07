/** Production Hostinger: admin ana domain altında /yonetim. Yerelde genelde boş. */
export const adminBasePath =
  process.env.NEXT_PUBLIC_ADMIN_BASE_PATH ??
  process.env.ADMIN_BASE_PATH ??
  "";

export function withBase(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${adminBasePath}${p}`;
}

export function adminRedirect(path: string, request: Request): URL {
  return new URL(withBase(path), request.url);
}

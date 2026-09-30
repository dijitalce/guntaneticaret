import { apiAdminSession, redirectTo } from "../../../../src/api-helpers";
import { renderShippingLabels } from "../../../../src/shipping-label";

export async function GET(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const ids = new URL(request.url).searchParams
    .getAll("ids")
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f-]{36}$/i.test(s));
  const html = await renderShippingLabels(ids);
  if (!html) return new Response("Sipariş bulunamadı.", { status: 404 });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

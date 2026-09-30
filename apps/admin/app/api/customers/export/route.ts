import { listCustomers } from "@guntan/db";
import { apiAdminSession, redirectTo } from "../../../../src/api-helpers";

function csv(value: unknown) {
  const s = value == null ? "" : String(value);
  return /[",;\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function GET(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const sp = new URL(request.url).searchParams;
  const { rows } = await listCustomers({
    q: sp.get("q") ?? undefined,
    filter: sp.get("filtre") ?? undefined,
    sort: sp.get("sirala") ?? undefined,
    limit: 50_000,
    offset: 0,
  });
  const lines = [
    ["Ad", "Soyad", "E-posta", "Telefon", "Fatura tipi", "Sipariş", "Toplam harcama", "Son sipariş", "Kayıt", "Etiketler"].join(";"),
    ...rows.map((c) =>
      [
        c.first_name,
        c.last_name,
        c.email,
        c.phone ?? "",
        c.invoice_type === "corporate" ? "Kurumsal" : "Bireysel",
        Number(c.orders),
        Number(c.spent ?? 0).toFixed(2).replace(".", ","),
        c.last_order_at ? new Date(c.last_order_at).toLocaleDateString("tr-TR") : "",
        new Date(c.created_at).toLocaleDateString("tr-TR"),
        c.tags.join(", "),
      ]
        .map(csv)
        .join(";"),
    ),
  ];
  return new Response(`\uFEFF${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="musteriler-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

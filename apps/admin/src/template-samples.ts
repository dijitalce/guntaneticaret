import { emailLayout, itemsTableHtml, renderText, type ResolvedTemplate } from "@guntan/db";

export const SAMPLE_VARS: Record<string, string> = {
  site_name: "Örnek Mağaza",
  site_url: "https://ornek.com",
  customer_name: "Ayşe Yılmaz",
  customer_email: "ayse@ornek.com",
  order_no: "GT-240930-1042",
  order_total: "2.349,90 ₺",
  order_date: "30 Eylül 2026 14:05",
  order_url: "https://ornek.com/hesabim/siparisler",
  payment_method: "Havale / EFT",
  bank_accounts:
    "<p><strong>Garanti BBVA</strong><br>Örnek Otomotiv Ltd. Şti.<br>TR00 0006 2000 0000 0000 0000 00</p>",
  carrier: "Aras Kargo",
  tracking_no: "1234567890",
  tracking_url: "https://kargotakip.araskargo.com.tr",
  cart_url: "https://ornek.com/sepet",
  coupon_code: "SEPET10",
  coupon_block: '<div class="coupon">SEPET10</div>',
  product_name: "Ön fren balatası (Bosch)",
  product_url: "https://ornek.com/urun/on-fren-balatasi",
  message: "Siparişinizdeki bir ürün tedarikçiden yarın depomuza ulaşacak, ardından hemen kargoya vereceğiz.",
  threshold: "2",
  count: "3",
  items_table: itemsTableHtml([
    { name: "Ön fren balatası (Bosch)", qty: 1, price: "1.249,90 ₺" },
    { name: "Yağ filtresi (Mann)", qty: 2, price: "1.100,00 ₺" },
  ]),
};

export function renderPreview(tpl: Pick<ResolvedTemplate, "subject" | "body" | "smsBody" | "marketing">, siteName = SAMPLE_VARS.site_name!) {
  const vars: Record<string, string> = { ...SAMPLE_VARS, site_name: siteName };
  return {
    subject: renderText(tpl.subject, vars, false),
    html: emailLayout({
      siteName,
      siteUrl: vars.site_url!,
      body: renderText(tpl.body, vars, true),
      footer: tpl.marketing ? ' · <a class="muted" href="#">Abonelikten çık</a>' : "",
    }),
    sms: renderText(tpl.smsBody, vars, false),
  };
}

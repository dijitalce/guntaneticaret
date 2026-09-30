import { getTemplateOverrides, type TemplateOverride } from "./settings";

export type TemplateGroup = "orders" | "shipping" | "returns" | "customer" | "automations" | "admin";

export const TEMPLATE_GROUPS: { key: TemplateGroup; label: string }[] = [
  { key: "orders", label: "Siparişler" },
  { key: "shipping", label: "Kargo" },
  { key: "returns", label: "İadeler" },
  { key: "customer", label: "Müşteri" },
  { key: "automations", label: "Otomasyonlar" },
  { key: "admin", label: "Yönetici" },
];

export type TemplateDef = {
  key: string;
  group: TemplateGroup;
  label: string;
  description: string;
  email: boolean;
  sms: boolean;
  subject: string;
  body: string;
  smsBody: string;
  marketing?: boolean;
};

const ORDER_SUMMARY = `<p>Sipariş no: <strong>{{order_no}}</strong><br>Tarih: {{order_date}}<br>Toplam: <strong>{{order_total}}</strong></p>
{{items_table}}`;

export const TEMPLATES: TemplateDef[] = [
  {
    key: "order_created",
    group: "orders",
    label: "Sipariş oluşturuldu",
    description: "Kartla ödemesi tamamlanan siparişlerde müşteriye gönderilir.",
    email: true,
    sms: false,
    subject: "Siparişiniz alındı - {{order_no}}",
    body: `<h2>Teşekkürler {{customer_name}}!</h2><p>Siparişinizi aldık, en kısa sürede hazırlayıp kargoya vereceğiz.</p>${ORDER_SUMMARY}<p><a class="btn" href="{{order_url}}">Siparişimi görüntüle</a></p>`,
    smsBody: "{{site_name}}: {{order_no}} numarali siparisiniz alindi. Toplam {{order_total}}. Tesekkurler!",
  },
  {
    key: "order_created_bank",
    group: "orders",
    label: "Sipariş oluşturuldu (Havale / EFT)",
    description: "Havale ile verilen siparişte ödeme bilgileriyle birlikte gönderilir.",
    email: true,
    sms: false,
    subject: "Siparişiniz alındı, ödeme bekleniyor - {{order_no}}",
    body: `<h2>Siparişiniz alındı</h2><p>Merhaba {{customer_name}}, siparişinizin hazırlanması için <strong>{{order_total}}</strong> tutarındaki ödemeyi aşağıdaki hesaplardan birine yapmanız yeterli. Açıklama kısmına <strong>{{order_no}}</strong> yazmayı unutmayın.</p>{{bank_accounts}}${ORDER_SUMMARY}`,
    smsBody: "{{site_name}}: {{order_no}} siparisiniz alindi. {{order_total}} tutarindaki havale aciklamasina siparis no yaziniz.",
  },
  {
    key: "payment_confirmed",
    group: "orders",
    label: "Ödeme onaylandı (Havale / EFT)",
    description: "Havale ödemesi yönetim panelinden onaylandığında gönderilir.",
    email: true,
    sms: false,
    subject: "Ödemeniz onaylandı - {{order_no}}",
    body: `<h2>Ödemeniz onaylandı</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişinizin ödemesi onaylandı. Siparişiniz hazırlanıyor.</p>${ORDER_SUMMARY}`,
    smsBody: "{{site_name}}: {{order_no}} siparisinizin odemesi onaylandi, siparisiniz hazirlaniyor.",
  },
  {
    key: "order_preparing",
    group: "orders",
    label: "Sipariş hazırlanıyor",
    description: "Sipariş hazırlığa alındığında gönderilir.",
    email: false,
    sms: false,
    subject: "Siparişiniz hazırlanıyor - {{order_no}}",
    body: `<h2>Siparişiniz hazırlanıyor</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişinizi hazırlamaya başladık.</p>`,
    smsBody: "{{site_name}}: {{order_no}} siparisiniz hazirlaniyor.",
  },
  {
    key: "order_updated",
    group: "orders",
    label: "Sipariş güncellendi",
    description: "Yönetici siparişe müşteriye görünür bir not eklediğinde gönderilir.",
    email: true,
    sms: false,
    subject: "Siparişinizle ilgili güncelleme - {{order_no}}",
    body: `<h2>Siparişiniz güncellendi</h2><p>Merhaba {{customer_name}},</p><p>{{message}}</p>`,
    smsBody: "{{site_name}}: {{order_no}} siparisinizle ilgili bir guncelleme var.",
  },
  {
    key: "order_cancelled",
    group: "orders",
    label: "Sipariş iptal edildi",
    description: "Sipariş iptal edildiğinde gönderilir.",
    email: true,
    sms: false,
    subject: "Siparişiniz iptal edildi - {{order_no}}",
    body: `<h2>Siparişiniz iptal edildi</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişiniz iptal edildi. Sorularınız için bize ulaşabilirsiniz.</p>`,
    smsBody: "{{site_name}}: {{order_no}} siparisiniz iptal edildi.",
  },
  {
    key: "order_shipped",
    group: "shipping",
    label: "Kargoya verildi",
    description: "Sipariş kargoya verildiğinde takip bilgisiyle gönderilir.",
    email: true,
    sms: true,
    subject: "Siparişiniz kargoda - {{order_no}}",
    body: `<h2>Siparişiniz yola çıktı</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişiniz <strong>{{carrier}}</strong> ile gönderildi.</p><p>Takip no: <strong>{{tracking_no}}</strong></p><p><a class="btn" href="{{tracking_url}}">Kargomu takip et</a></p>`,
    smsBody: "{{site_name}}: {{order_no}} siparisiniz {{carrier}} ile kargoya verildi. Takip: {{tracking_no}}",
  },
  {
    key: "order_delivered",
    group: "shipping",
    label: "Teslim edildi",
    description: "Sipariş tamamlandı olarak işaretlendiğinde gönderilir.",
    email: true,
    sms: false,
    subject: "Siparişiniz teslim edildi - {{order_no}}",
    body: `<h2>Siparişiniz teslim edildi</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişinizin teslim edildiğini görüyoruz. İyi günlerde kullanın!</p>`,
    smsBody: "{{site_name}}: {{order_no}} siparisiniz teslim edildi. Iyi gunlerde kullanin!",
  },
  {
    key: "return_requested",
    group: "returns",
    label: "İade talebi alındı",
    description: "Müşteri iade talebi oluşturduğunda gönderilir.",
    email: true,
    sms: false,
    subject: "İade talebiniz alındı - {{order_no}}",
    body: `<h2>İade talebiniz alındı</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişiniz için iade talebinizi aldık. İnceleyip size dönüş yapacağız.</p>`,
    smsBody: "{{site_name}}: {{order_no}} icin iade talebiniz alindi.",
  },
  {
    key: "return_approved",
    group: "returns",
    label: "İade onaylandı",
    description: "İade talebi onaylandığında gönderilir.",
    email: true,
    sms: false,
    subject: "İade talebiniz onaylandı - {{order_no}}",
    body: `<h2>İadeniz onaylandı</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişinizin iadesi onaylandı.</p><p>{{message}}</p>`,
    smsBody: "{{site_name}}: {{order_no}} iade talebiniz onaylandi.",
  },
  {
    key: "return_rejected",
    group: "returns",
    label: "İade reddedildi",
    description: "İade talebi reddedildiğinde gönderilir.",
    email: true,
    sms: false,
    subject: "İade talebiniz hakkında - {{order_no}}",
    body: `<h2>İade talebiniz sonuçlandı</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişiniz için iade talebiniz onaylanamadı.</p><p>{{message}}</p>`,
    smsBody: "{{site_name}}: {{order_no}} iade talebiniz hakkinda e-posta gonderdik.",
  },
  {
    key: "customer_welcome",
    group: "customer",
    label: "Hesap oluşturuldu",
    description: "Müşteri üye olduğunda hoş geldin e-postası.",
    email: true,
    sms: false,
    subject: "{{site_name}} ailesine hoş geldiniz",
    body: `<h2>Hoş geldiniz {{customer_name}}!</h2><p>Hesabınız oluşturuldu. Aracınıza uygun parçaları kolayca bulmak için araç bilgilerinizi hesabınıza ekleyebilirsiniz.</p><p><a class="btn" href="{{site_url}}">Alışverişe başla</a></p>`,
    smsBody: "{{site_name}} ailesine hos geldiniz!",
  },
  {
    key: "abandoned_cart",
    group: "automations",
    label: "Terk edilmiş sepet (1. hatırlatma)",
    description: "Sepetinde ürün bırakıp ayrılan müşteriye gönderilir.",
    email: true,
    sms: false,
    marketing: true,
    subject: "Sepetinizde ürünler sizi bekliyor",
    body: `<h2>Sepetinizi unuttunuz mu?</h2><p>Merhaba {{customer_name}}, sepetinize eklediğiniz ürünler hâlâ sizi bekliyor. Stoklar tükenmeden siparişinizi tamamlayın.</p>{{items_table}}{{coupon_block}}<p><a class="btn" href="{{cart_url}}">Sepete dön</a></p>`,
    smsBody: "{{site_name}}: Sepetinizdeki urunler sizi bekliyor. {{cart_url}}",
  },
  {
    key: "abandoned_cart_2",
    group: "automations",
    label: "Terk edilmiş sepet (2. hatırlatma)",
    description: "İlk hatırlatmadan sonra sipariş verilmezse gönderilir.",
    email: true,
    sms: false,
    marketing: true,
    subject: "Son hatırlatma: sepetinizdeki ürünler",
    body: `<h2>Ürünleriniz hâlâ sepetinizde</h2><p>Merhaba {{customer_name}}, sepetinizi sizin için sakladık.</p>{{items_table}}{{coupon_block}}<p><a class="btn" href="{{cart_url}}">Siparişi tamamla</a></p>`,
    smsBody: "{{site_name}}: Sepetinizi sizin icin sakladik. {{cart_url}}",
  },
  {
    key: "bank_reminder",
    group: "automations",
    label: "Havale ödeme hatırlatması",
    description: "Havale ödemesi beklenen siparişlerde belirlenen süre sonra gönderilir.",
    email: true,
    sms: false,
    subject: "Ödemenizi bekliyoruz - {{order_no}}",
    body: `<h2>Siparişiniz ödeme bekliyor</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişiniz için <strong>{{order_total}}</strong> tutarındaki ödemeniz henüz ulaşmadı.</p>{{bank_accounts}}<p>Ödeme yapılmazsa sipariş otomatik olarak iptal edilebilir.</p>`,
    smsBody: "{{site_name}}: {{order_no}} siparisiniz icin {{order_total}} odemenizi bekliyoruz.",
  },
  {
    key: "bank_cancelled",
    group: "automations",
    label: "Havale ödemesi gelmedi, iptal",
    description: "Süresi içinde ödemesi gelmeyen havale siparişi otomatik iptal edildiğinde gönderilir.",
    email: true,
    sms: false,
    subject: "Siparişiniz iptal edildi - {{order_no}}",
    body: `<h2>Siparişiniz iptal edildi</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişinizin ödemesi süresi içinde ulaşmadığı için sipariş iptal edildi. Dilerseniz yeniden sipariş verebilirsiniz.</p><p><a class="btn" href="{{site_url}}">Siteye git</a></p>`,
    smsBody: "{{site_name}}: {{order_no}} siparisiniz odeme gelmedigi icin iptal edildi.",
  },
  {
    key: "back_in_stock",
    group: "automations",
    label: "Ürün tekrar stokta",
    description: "Stoğa gelince haber ver diyen müşteriye ürün stoğa girince gönderilir.",
    email: true,
    sms: false,
    subject: "{{product_name}} tekrar stokta",
    body: `<h2>Beklediğiniz ürün stokta!</h2><p><strong>{{product_name}}</strong> tekrar satışta. Stoklar sınırlı, kaçırmayın.</p><p><a class="btn" href="{{product_url}}">Ürünü incele</a></p>`,
    smsBody: "{{site_name}}: {{product_name}} tekrar stokta. {{product_url}}",
  },
  {
    key: "review_request",
    group: "automations",
    label: "Teslimat sonrası değerlendirme",
    description: "Teslimattan belirli gün sonra müşteriden görüş ister.",
    email: true,
    sms: false,
    subject: "Siparişinizden memnun kaldınız mı?",
    body: `<h2>Görüşünüz bizim için değerli</h2><p>Merhaba {{customer_name}}, {{order_no}} numaralı siparişinizden memnun kaldınız mı? Bu e-postayı yanıtlayarak görüşlerinizi bize iletebilirsiniz.</p>{{items_table}}`,
    smsBody: "{{site_name}}: Siparisinizden memnun kaldiniz mi? Gorusleriniz bizim icin degerli.",
  },
  {
    key: "admin_new_order",
    group: "admin",
    label: "Yeni sipariş (yöneticiye)",
    description: "Yeni sipariş geldiğinde bildirim e-postalarına gönderilir.",
    email: true,
    sms: false,
    subject: "Yeni sipariş: {{order_no}} - {{order_total}}",
    body: `<h2>Yeni sipariş geldi</h2><p>{{customer_name}} · {{customer_email}} · {{customer_phone}}</p><p>Ödeme: {{payment_method}}</p>${ORDER_SUMMARY}<p><a class="btn" href="{{admin_order_url}}">Siparişi aç</a></p>`,
    smsBody: "Yeni siparis {{order_no}} {{order_total}}",
  },
  {
    key: "low_stock_admin",
    group: "admin",
    label: "Düşük stok uyarısı",
    description: "Son dönemde satılan ürünlerin stoğu azaldığında yöneticiye gönderilir.",
    email: true,
    sms: false,
    subject: "Düşük stok uyarısı ({{count}} ürün)",
    body: `<h2>Stoğu azalan ürünler</h2><p>Son 60 günde satılan ve stoğu {{threshold}} adet veya altına düşen ürünler:</p>{{items_table}}`,
    smsBody: "Dusuk stok: {{count}} urun",
  },
];

export const TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: "site_name", label: "Site adı" },
  { key: "site_url", label: "Site adresi" },
  { key: "customer_name", label: "Müşteri adı" },
  { key: "customer_email", label: "Müşteri e-postası" },
  { key: "order_no", label: "Sipariş no" },
  { key: "order_total", label: "Sipariş tutarı" },
  { key: "order_date", label: "Sipariş tarihi" },
  { key: "order_url", label: "Sipariş bağlantısı" },
  { key: "items_table", label: "Ürün tablosu" },
  { key: "payment_method", label: "Ödeme yöntemi" },
  { key: "bank_accounts", label: "Banka hesapları" },
  { key: "carrier", label: "Kargo firması" },
  { key: "tracking_no", label: "Takip no" },
  { key: "tracking_url", label: "Takip bağlantısı" },
  { key: "cart_url", label: "Sepet bağlantısı" },
  { key: "coupon_code", label: "Kupon kodu" },
  { key: "product_name", label: "Ürün adı" },
  { key: "product_url", label: "Ürün bağlantısı" },
  { key: "message", label: "Mesaj" },
];

export type ResolvedTemplate = TemplateDef & TemplateOverride;

export async function resolveTemplate(key: string): Promise<ResolvedTemplate | null> {
  const def = TEMPLATES.find((t) => t.key === key);
  if (!def) return null;
  const overrides = await getTemplateOverrides().catch(() => ({}) as Record<string, TemplateOverride>);
  const o = overrides[key] ?? {};
  return {
    ...def,
    email: o.email ?? def.email,
    sms: o.sms ?? def.sms,
    subject: o.subject?.trim() || def.subject,
    body: o.body?.trim() || def.body,
    smsBody: o.smsBody?.trim() || def.smsBody,
  };
}

const RAW_KEYS = new Set(["items_table", "bank_accounts", "coupon_block"]);

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderText(template: string, vars: Record<string, string>, html: boolean): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key] ?? "";
    if (!html || RAW_KEYS.has(key)) return value;
    return escapeHtml(value);
  });
}

export function emailLayout(input: {
  siteName: string;
  siteUrl: string;
  logoUrl?: string | null;
  body: string;
  preheader?: string;
  footer?: string;
}): string {
  const logo = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(input.siteName)}" style="max-height:44px;max-width:200px">`
    : `<strong style="font-size:20px;color:#0f172a">${escapeHtml(input.siteName)}</strong>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(input.siteName)}</title>
<style>body{margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a}
.wrap{max-width:600px;margin:0 auto;padding:24px 12px}.card{background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0}
h2{margin:0 0 12px;font-size:20px}p{line-height:1.6;font-size:15px;margin:0 0 14px}
.btn{display:inline-block;background:#1d4ed8;color:#fff !important;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600}
table.items{width:100%;border-collapse:collapse;margin:8px 0 18px}table.items td{border-bottom:1px solid #e2e8f0;padding:8px 4px;font-size:14px;vertical-align:middle}
.muted{color:#64748b;font-size:12px}.coupon{border:2px dashed #1d4ed8;border-radius:10px;padding:12px;text-align:center;font-size:18px;font-weight:700;margin:0 0 16px}</style></head>
<body><span style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preheader ?? "")}</span><div class="wrap">
<div style="padding:8px 4px 16px"><a href="${escapeHtml(input.siteUrl)}" style="text-decoration:none">${logo}</a></div>
<div class="card">${input.body}</div>
<p class="muted" style="text-align:center;margin-top:16px">${escapeHtml(input.siteName)} · <a href="${escapeHtml(input.siteUrl)}" class="muted">${escapeHtml(input.siteUrl.replace(/^https?:\/\//, ""))}</a>${input.footer ?? ""}</p>
</div></body></html>`;
}

export function itemsTableHtml(items: { name: string; qty: number; price?: string; imageUrl?: string | null }[]): string {
  if (!items.length) return "";
  const rowsHtml = items
    .map(
      (i) =>
        `<tr><td style="width:56px">${i.imageUrl ? `<img src="${escapeHtml(i.imageUrl)}" width="48" height="48" style="object-fit:contain;border-radius:6px">` : ""}</td><td>${escapeHtml(i.name)}<br><span class="muted">Adet: ${i.qty}</span></td><td style="text-align:right;white-space:nowrap">${escapeHtml(i.price ?? "")}</td></tr>`,
    )
    .join("");
  return `<table class="items">${rowsHtml}</table>`;
}

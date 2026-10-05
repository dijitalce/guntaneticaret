export const ENTITY_LABELS: Record<string, string> = {
  order: "Sipariş",
  product: "Ürün",
  tenant: "Site",
  tenant_domain: "Alan adı",
  tenant_bank: "Banka hesabı",
  vehicle_brand: "Araç markası",
  vehicle_model: "Araç modeli",
  manufacturer: "Üretici",
  brand_group: "Marka grubu",
  price_tiers: "Fiyat oranları",
  pricing: "Fiyat oranları",
  admin_user: "Kullanıcı",
  admin_session: "Oturum",
  customer: "Müşteri",
  page: "Sayfa",
  banner: "Banner",
  coupon: "Kupon",
  campaign: "Kampanya",
  popup: "Popup",
  segment: "Segment",
  automation: "Otomasyon",
  notification: "Bildirim",
  notification_template: "Bildirim şablonu",
  shipping_settings: "Kargo ayarı",
  marketing_settings: "Pazarlama ayarı",
  integration: "Eklenti",
  supplier_sync: "Tedarikçi senkronu",
  abandoned_cart: "Terk edilmiş sepet",
  xml_source: "XML kaynağı",
};

export const ACTION_LABELS: Record<string, string> = {
  create: "Oluşturdu",
  update: "Güncelledi",
  delete: "Sildi",
  login: "Giriş yaptı",
  login_failed: "Başarısız giriş",
  logout: "Çıkış yaptı",
  confirm: "Ödemeyi onayladı",
  cancel: "İptal etti",
  prepare: "Hazırlığa aldı",
  ship: "Kargoya verdi",
  complete: "Tamamladı",
  comment: "Not ekledi",
  tags: "Etiketleri güncelledi",
  password_reset: "Şifre sıfırladı",
  password_change: "Şifresini değiştirdi",
  revoke_sessions: "Oturumları kapattı",
  activate: "Aktif etti",
  deactivate: "Pasif etti",
  run_full: "Tam senkron başlattı",
  run_import_only: "İçe aktarma başlattı",
  connect: "Bağlantıyı test etti",
  run_feed: "Kaynağı çalıştırdı",
  send: "Gönderdi",
  test: "Test gönderdi",
  remind: "Hatırlatma gönderdi",
  notify: "Bildirim gönderdi",
  return_create: "İade kaydı açtı",
  return_approve: "İadeyi onayladı",
  return_reject: "İadeyi reddetti",
};

export function entityLabel(entity: string) {
  return ENTITY_LABELS[entity] ?? entity;
}

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export function entityHref(entity: string, id: string): string | null {
  switch (entity) {
    case "order":
      return `/orders/${id}`;
    case "product":
      return /^[0-9a-f-]{36}$/i.test(id) ? `/catalog/products?id=${id}` : "/catalog/products";
    case "abandoned_cart":
      return `/abandoned-carts/${id}`;
    case "tenant":
      return `/tenants/${id}`;
    case "vehicle_brand":
      return `/catalog/brands/${id}`;
    case "vehicle_model":
      return `/catalog/models/${id}`;
    case "brand_group":
      return `/catalog/groups/${id}`;
    case "manufacturer":
      return "/catalog/manufacturers";
    case "admin_user":
      return `/system/users/${id}`;
    case "customer":
      return `/customers/${id}`;
    case "page":
      return `/content/pages/${id}`;
    case "banner":
      return `/content/banners/${id}`;
    case "coupon":
      return `/marketing/coupons/${id}`;
    case "campaign":
      return `/marketing/campaigns/${id}`;
    case "popup":
      return `/marketing/popups/${id}`;
    case "xml_source":
      return `/integrations/xml/sources/${id}`;
    default:
      return null;
  }
}

export function actionTone(action: string): "ok" | "bad" | "warn" | "info" | "neutral" {
  if (action === "delete" || action === "cancel" || action === "login_failed" || action === "deactivate") return "bad";
  if (action === "create" || action === "confirm" || action === "complete" || action === "activate") return "ok";
  if (action.startsWith("password") || action === "revoke_sessions") return "warn";
  if (action === "login" || action === "logout") return "info";
  return "neutral";
}

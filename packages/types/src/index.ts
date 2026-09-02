export const TENANT_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  MAINTENANCE: "maintenance",
} as const;
export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];

export const VISIBILITY_MODE = {
  ALL: "ALL",
  GROUPS: "GROUPS",
  BRANDS: "BRANDS",
  CUSTOM: "CUSTOM",
} as const;
export type VisibilityMode = (typeof VISIBILITY_MODE)[keyof typeof VISIBILITY_MODE];

export const CATALOG_RULE_KIND = {
  INCLUDE_GROUP: "include_group",
  INCLUDE_BRAND: "include_brand",
  INCLUDE_CATEGORY: "include_category",
  INCLUDE_PRODUCT: "include_product",
  EXCLUDE_BRAND: "exclude_brand",
  EXCLUDE_CATEGORY: "exclude_category",
  EXCLUDE_PRODUCT: "exclude_product",
} as const;
export type CatalogRuleKind = (typeof CATALOG_RULE_KIND)[keyof typeof CATALOG_RULE_KIND];

export const PRODUCT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  MISSING_FROM_FEED: "missing_from_feed",
} as const;
export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export const PRODUCT_SOURCE = {
  XML: "xml",
  MANUAL: "manual",
} as const;
export type ProductSource = (typeof PRODUCT_SOURCE)[keyof typeof PRODUCT_SOURCE];

export const STOCK_STATUS = {
  IN_STOCK: "in_stock",
  OUT_OF_STOCK: "out_of_stock",
  BACKORDER: "backorder",
} as const;
export type StockStatus = (typeof STOCK_STATUS)[keyof typeof STOCK_STATUS];

export const ORDER_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
  PREPARING: "preparing",
  SHIPPED: "shipped",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_METHOD = {
  BANK_TRANSFER: "bank_transfer",
} as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_STATUS = {
  AWAITING: "awaiting",
  CONFIRMED: "confirmed",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const IMPORT_RUN_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  COMPLETED_WITH_WARNINGS: "completed_with_warnings",
  FAILED: "failed",
} as const;
export type ImportRunStatus = (typeof IMPORT_RUN_STATUS)[keyof typeof IMPORT_RUN_STATUS];

export const LISTING_SORT = {
  RECOMMENDED: "recommended",
  PRICE_ASC: "price_asc",
  PRICE_DESC: "price_desc",
  NEW: "new",
  BESTSELLER: "bestseller",
} as const;
export type ListingSort = (typeof LISTING_SORT)[keyof typeof LISTING_SORT];

export const ADMIN_PERMISSION = {
  DASHBOARD_READ: "dashboard.read",
  CATALOG_READ: "catalog.read",
  CATALOG_WRITE: "catalog.write",
  TENANT_READ: "tenant.read",
  TENANT_WRITE: "tenant.write",
  ORDER_READ: "order.read",
  ORDER_WRITE: "order.write",
  CUSTOMER_READ: "customer.read",
  MARKETING_WRITE: "marketing.write",
  CONTENT_WRITE: "content.write",
  INTEGRATION_WRITE: "integration.write",
  SYSTEM_WRITE: "system.write",
  AUDIT_READ: "audit.read",
} as const;
export type AdminPermission = (typeof ADMIN_PERMISSION)[keyof typeof ADMIN_PERMISSION];

export const ADMIN_ROLE = {
  SUPER_ADMIN: "super_admin",
  CATALOG_MANAGER: "catalog_manager",
  ORDER_MANAGER: "order_manager",
  CONTENT_MANAGER: "content_manager",
  TENANT_MANAGER: "tenant_manager",
  VIEWER: "viewer",
} as const;
export type AdminRole = (typeof ADMIN_ROLE)[keyof typeof ADMIN_ROLE];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: Object.values(ADMIN_PERMISSION),
  catalog_manager: [
    ADMIN_PERMISSION.DASHBOARD_READ,
    ADMIN_PERMISSION.CATALOG_READ,
    ADMIN_PERMISSION.CATALOG_WRITE,
  ],
  order_manager: [
    ADMIN_PERMISSION.DASHBOARD_READ,
    ADMIN_PERMISSION.ORDER_READ,
    ADMIN_PERMISSION.ORDER_WRITE,
    ADMIN_PERMISSION.CUSTOMER_READ,
  ],
  content_manager: [
    ADMIN_PERMISSION.DASHBOARD_READ,
    ADMIN_PERMISSION.CONTENT_WRITE,
    ADMIN_PERMISSION.MARKETING_WRITE,
  ],
  tenant_manager: [
    ADMIN_PERMISSION.DASHBOARD_READ,
    ADMIN_PERMISSION.TENANT_READ,
    ADMIN_PERMISSION.TENANT_WRITE,
  ],
  viewer: [
    ADMIN_PERMISSION.DASHBOARD_READ,
    ADMIN_PERMISSION.CATALOG_READ,
    ADMIN_PERMISSION.TENANT_READ,
    ADMIN_PERMISSION.ORDER_READ,
    ADMIN_PERMISSION.CUSTOMER_READ,
    ADMIN_PERMISSION.AUDIT_READ,
  ],
};

export const THEME_TOKEN_KEYS = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "border",
  "muted",
  "mutedForeground",
  "card",
  "destructive",
  "radius",
  "font",
] as const;
export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];

export type ThemeTokens = Record<ThemeTokenKey, string>;

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primary: "#b42318",
  secondary: "#1f2937",
  accent: "#c2410c",
  background: "#f7f5f2",
  foreground: "#16181d",
  border: "#d9d4cc",
  muted: "#ece8e1",
  mutedForeground: "#5c5f66",
  card: "#ffffff",
  destructive: "#b42318",
  radius: "0.5rem",
  font: "Inter, ui-sans-serif, system-ui, sans-serif",
};

export type ResolvedTenant = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  visibilityMode: VisibilityMode;
  hostname: string;
  canonicalHost: string;
};

export type TenantPublicConfig = {
  tenant: ResolvedTenant;
  siteName: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  placeholderImageUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  theme: ThemeTokens;
  defaultMetaTitle: string | null;
  defaultMetaDescription: string | null;
  ogImageUrl: string | null;
  gaId: string | null;
  gtmId: string | null;
  customScripts: string | null;
  allCatalogUrl: string | null;
};

export const XML_FIELD_KEYS = [
  "externalId",
  "sku",
  "name",
  "description",
  "manufacturer",
  "category",
  "price",
  "compareAtPrice",
  "stock",
  "barcode",
  "oem",
  "imageUrl",
  "vehicleBrand",
  "vehicleModel",
  "vehicleGeneration",
  "vehicleEngine",
] as const;
export type XmlFieldKey = (typeof XML_FIELD_KEYS)[number];

export type XmlFieldMapping = Partial<Record<XmlFieldKey, string>>;

export const LISTING_PAGE_SIZE = 24;
export const XML_BATCH_SIZE = 500;
export const SITEMAP_URL_LIMIT = 10_000;
export const TENANT_HOST_CACHE_TTL_SECONDS = 300;
export const TENANT_CONFIG_CACHE_TTL_SECONDS = 300;
export const NAV_CACHE_TTL_SECONDS = 600;

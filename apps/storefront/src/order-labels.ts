import { ORDER_STATUS, type OrderStatus } from "@guntan/types";

const LABELS: Record<string, string> = {
  [ORDER_STATUS.PENDING_PAYMENT]: "Ödeme bekleniyor",
  [ORDER_STATUS.PAID]: "Ödeme alındı",
  [ORDER_STATUS.PREPARING]: "Hazırlanıyor",
  [ORDER_STATUS.SHIPPED]: "Kargoda",
  [ORDER_STATUS.COMPLETED]: "Tamamlandı",
  [ORDER_STATUS.CANCELLED]: "İptal",
  [ORDER_STATUS.REFUNDED]: "İade",
};

export function orderStatusLabel(status: string) {
  return LABELS[status] ?? status;
}

export function orderStatusTone(status: string): "warn" | "ok" | "info" | "muted" | "bad" {
  if (status === ORDER_STATUS.PENDING_PAYMENT) return "warn";
  if (status === ORDER_STATUS.PAID || status === ORDER_STATUS.PREPARING) return "info";
  if (status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.COMPLETED) return "ok";
  if (status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.REFUNDED) return "bad";
  return "muted";
}

export function formatMoney(value: string | number) {
  return `${Number(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export function formatDateTr(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type { OrderStatus };

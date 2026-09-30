export const CAMPAIGN_STATUS: Record<string, { label: string; tone: "neutral" | "warn" | "ok" | "bad" | "info" }> = {
  draft: { label: "Taslak", tone: "neutral" },
  sending: { label: "Gönderiliyor", tone: "warn" },
  sent: { label: "Gönderildi", tone: "ok" },
  cancelled: { label: "İptal", tone: "bad" },
};

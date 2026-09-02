import { logger } from "@guntan/observability";

export async function sendOrderReceivedEmail(input: {
  to: string;
  siteName: string;
  orderNo: string;
  amount: string;
  ibanLines: string[];
}) {
  logger.info({ to: input.to, orderNo: input.orderNo }, "order email queued");
  return {
    subject: `${input.siteName} siparişiniz alındı — ${input.orderNo}`,
    body: [
      `Sipariş no: ${input.orderNo}`,
      `Tutar: ${input.amount} TL`,
      `Havale açıklamasına sipariş numaranızı yazın.`,
      ...input.ibanLines,
    ].join("\n"),
  };
}

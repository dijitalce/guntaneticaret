export interface ShippingQuote {
  code: string;
  label: string;
  amount: string;
}

export interface ShippingProvider {
  readonly key: string;
  quote(input: { subtotal: number; city?: string }): Promise<ShippingQuote[]>;
}

/** Ücretsiz kargo için minimum sepet tutarı (KDV dahil). */
export const FREE_SHIPPING_MIN = 2500;
/** Standart kargo ücreti (eşik altı). */
export const STANDARD_SHIPPING_FEE = 99.9;

export function shippingAmountForSubtotal(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_MIN ? 0 : STANDARD_SHIPPING_FEE;
}

export function remainingForFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_MIN - subtotal);
}

export class ManualShippingProvider implements ShippingProvider {
  readonly key = "manual";

  async quote(input: { subtotal: number }): Promise<ShippingQuote[]> {
    const amount = shippingAmountForSubtotal(input.subtotal).toFixed(2);
    return [{ code: "standard", label: "Standart Kargo", amount }];
  }
}

export function getShippingProvider(): ShippingProvider {
  return new ManualShippingProvider();
}

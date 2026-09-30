export interface ShippingQuote {
  code: string;
  label: string;
  amount: string;
}

export interface ShippingProvider {
  readonly key: string;
  quote(input: { subtotal: number; city?: string }): Promise<ShippingQuote[]>;
}

/** Standart kargo ücreti; ücretsiz kargo eşiği yok. */
export const STANDARD_SHIPPING_FEE = 99.9;

export function shippingAmountForSubtotal(_subtotal: number): number {
  return STANDARD_SHIPPING_FEE;
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

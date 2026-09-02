export interface ShippingQuote {
  code: string;
  label: string;
  amount: string;
}

export interface ShippingProvider {
  readonly key: string;
  quote(input: { subtotal: number; city?: string }): Promise<ShippingQuote[]>;
}

export class ManualShippingProvider implements ShippingProvider {
  readonly key = "manual";

  async quote(input: { subtotal: number }): Promise<ShippingQuote[]> {
    const amount = input.subtotal >= 2500 ? "0.00" : "99.90";
    return [{ code: "standard", label: "Standart Kargo", amount }];
  }
}

export function getShippingProvider(): ShippingProvider {
  return new ManualShippingProvider();
}

import { PAYMENT_METHOD, PAYMENT_STATUS } from "@guntan/types";

export type PaymentIntent = {
  method: typeof PAYMENT_METHOD.BANK_TRANSFER;
  status: typeof PAYMENT_STATUS.AWAITING;
  instructions: {
    bankName: string;
    accountHolder: string;
    iban: string;
    reference: string;
  }[];
};

export interface PaymentProvider {
  readonly key: string;
  createPayment(input: {
    orderNo: string;
    amount: string;
    bankAccounts: { bankName: string; accountHolder: string; iban: string }[];
  }): Promise<PaymentIntent>;
}

export class BankTransferProvider implements PaymentProvider {
  readonly key = PAYMENT_METHOD.BANK_TRANSFER;

  async createPayment(input: {
    orderNo: string;
    amount: string;
    bankAccounts: { bankName: string; accountHolder: string; iban: string }[];
  }): Promise<PaymentIntent> {
    return {
      method: PAYMENT_METHOD.BANK_TRANSFER,
      status: PAYMENT_STATUS.AWAITING,
      instructions: input.bankAccounts.map((a) => ({
        ...a,
        reference: input.orderNo,
      })),
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new BankTransferProvider();
}

import { describe, expect, it } from "vitest";
import { BankTransferProvider } from "./index";

describe("BankTransferProvider", () => {
  it("returns awaiting transfer with order no as reference", async () => {
    const provider = new BankTransferProvider();
    const intent = await provider.createPayment({
      orderNo: "GNT-1",
      amount: "100.00",
      bankAccounts: [{ bankName: "Ziraat", accountHolder: "Guntan", iban: "TR00" }],
    });
    expect(intent.status).toBe("awaiting");
    expect(intent.instructions[0]?.reference).toBe("GNT-1");
  });
});

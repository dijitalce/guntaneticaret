import { describe, expect, it } from "vitest";
import { arasConfigFromEnv, buildSetOrderBody, normalizePhone, parseTrackingJson } from "./aras";

describe("aras", () => {
  it("normalizes Turkish phone numbers", () => {
    expect(normalizePhone("0 (532) 123 45 67")).toBe("5321234567");
    expect(normalizePhone("+90 532 123 45 67")).toBe("5321234567");
  });

  it("escapes receiver data in SetOrder body", () => {
    const config = arasConfigFromEnv({ ARAS_USERNAME: "u", ARAS_PASSWORD: "p" })!;
    const body = buildSetOrderBody(config, {
      integrationCode: "GNT-1",
      receiverName: "Ali & <Veli>",
      receiverAddress: "Cad. No:1",
      receiverPhone: "05321234567",
      receiverCity: "İSTANBUL",
      receiverTown: "KADIKÖY",
      pieceCount: 2,
    });
    expect(body).toContain("<ReceiverName>Ali &amp; &lt;Veli&gt;</ReceiverName>");
    expect(body).toContain("<IntegrationCode>GNT-1</IntegrationCode>");
    expect(body).toContain("<BarcodeNumber>GNT-1-2</BarcodeNumber>");
    expect(body).toContain("<PayorTypeCode>1</PayorTypeCode>");
  });

  it("reads tracking number and delivery from query JSON", () => {
    const t = parseTrackingJson(
      JSON.stringify({ QueryResult: { Cargo: [{ KARGO_TAKIP_NO: "123456789", DURUM_KODU: "6", DURUMU: "TESLİM EDİLDİ" }] } }),
    );
    expect(t).toMatchObject({ found: true, trackingNo: "123456789", delivered: true });
    expect(parseTrackingJson(JSON.stringify({ QueryResult: { Cargo: { KARGO_TAKIP_NO: "1", DURUM_KODU: "2", DURUMU: "YOLDA" } } })))
      .toMatchObject({ found: true, delivered: false });
    expect(parseTrackingJson("")).toMatchObject({ found: false });
    expect(parseTrackingJson("{}")).toMatchObject({ found: false });
  });
});

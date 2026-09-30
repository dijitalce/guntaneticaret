import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  amountWithInstallment,
  buildOosPayForm,
  garantiConfigFromEnv,
  installmentOptions,
  parseCallback,
  parseInstallments,
  toKurus,
  type GarantiConfig,
} from "./garanti";

const config: GarantiConfig = {
  mode: "TEST",
  merchantId: "7000679",
  terminalId: "30691297",
  provUserId: "PROVAUT",
  provPassword: "123qweASD/",
  storeKey: "12345678",
  companyName: "Test",
  installments: parseInstallments("3:4.5,6:9,1:5,13:1,x:y"),
  installmentMinAmount: 0,
};

/** Garanti test ortamının gerçek dönüşündeki biçim: hashparams sonu ":" ile biter, hash SHA-1/base64. */
function signed(fields: Record<string, string>, unsigned: Record<string, string> = {}) {
  const hashparams = `${Object.keys(fields).join(":")}:`;
  const plain = Object.values(fields).join("") + config.storeKey;
  return { ...fields, ...unsigned, hashparams, hash: createHash("sha1").update(plain).digest("base64") };
}

describe("garanti", () => {
  it("parses installment table, ignoring invalid entries", () => {
    expect([...config.installments]).toEqual([
      [3, 4.5],
      [6, 9],
    ]);
  });

  it("converts TL to kuruş without float drift", () => {
    expect(toKurus(123.45)).toBe("12345");
    expect(toKurus("0.1")).toBe("10");
    expect(toKurus(1019.9)).toBe("101990");
  });

  it("adds installment fee", () => {
    expect(amountWithInstallment(1000, 1, config)).toBe(1000);
    expect(amountWithInstallment(1000, 3, config)).toBe(1045);
    expect(() => amountWithInstallment(1000, 2, config)).toThrow();
    expect(installmentOptions(1000, config).map((o) => o.count)).toEqual([1, 3, 6]);
    expect(installmentOptions(1000, { ...config, installmentMinAmount: 2000 }).map((o) => o.count)).toEqual([1]);
  });

  it("builds a v512 OOS_PAY form with the documented hash", () => {
    const { action, fields } = buildOosPayForm(config, {
      orderId: "GNT-TEST1",
      amount: 123.45,
      installment: 1,
      email: "a@b.c",
      customerIp: "1.2.3.4",
      successUrl: "https://x/ok",
      errorUrl: "https://x/err",
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(action).toContain("sanalposprovtest");
    expect(fields.txnamount).toBe("12345");
    expect(fields.txninstallmentcount).toBe("");
    const hashedPassword = createHash("sha1").update("123qweASD/030691297").digest("hex").toUpperCase();
    const expected = createHash("sha512")
      .update(`30691297GNT-TEST112345949https://x/okhttps://x/errsales12345678${hashedPassword}`)
      .digest("hex")
      .toUpperCase();
    expect(fields.secure3dhash).toBe(expected);
  });

  it("accepts a signed successful callback", () => {
    const data = signed(
      {
        clientid: "30691297",
        oid: "GNT-TEST1",
        authcode: "123456",
        procreturncode: "00",
        response: "Approved",
        mdstatus: "1",
        cavv: "",
        eci: "02",
        md: "abc",
        rnd: "xyz",
      },
      { orderid: "GNT-TEST1", txnamount: "12345", txninstallmentcount: "", hostrefnum: "999" },
    );
    expect(parseCallback(config, data)).toEqual({
      ok: true,
      orderId: "GNT-TEST1",
      amountKurus: "12345",
      installment: 1,
      authCode: "123456",
      hostRef: "999",
    });
  });

  it("rejects tampered or failed callbacks", () => {
    const good = signed({ oid: "GNT-1", mdstatus: "1", procreturncode: "00" }, { orderid: "GNT-1", txnamount: "100" });
    expect(parseCallback(config, good)).toMatchObject({ ok: true });
    expect(parseCallback(config, { ...good, oid: "GNT-2" })).toMatchObject({ ok: false, verified: false });
    const unsignedOid = signed({ mdstatus: "1", procreturncode: "00" }, { oid: "GNT-9", orderid: "GNT-9" });
    expect(parseCallback(config, unsignedOid)).toMatchObject({ ok: false, verified: false });
    expect(parseCallback(config, { oid: "GNT-1", mdstatus: "1", procreturncode: "00" })).toMatchObject({
      ok: false,
      verified: false,
    });
    const md0 = signed({ oid: "GNT-1", mdstatus: "0", procreturncode: "" }, { mderrormessage: "Doğrulama başarısız" });
    expect(parseCallback(config, md0)).toMatchObject({ ok: false, verified: true, reason: "Doğrulama başarısız" });
    const declined = signed({ oid: "GNT-1", mdstatus: "1", procreturncode: "51" }, { errmsg: "Limit yetersiz" });
    expect(parseCallback(config, declined)).toMatchObject({ ok: false, verified: true, reason: "Limit yetersiz" });
  });

  it("is disabled unless credentials are set", () => {
    expect(garantiConfigFromEnv({})).toBeNull();
    expect(
      garantiConfigFromEnv({
        GARANTI_MERCHANT_ID: "1",
        GARANTI_TERMINAL_ID: "2",
        GARANTI_PROV_PASSWORD: "p",
        GARANTI_STORE_KEY: "k",
      })?.mode,
    ).toBe("TEST");
  });
});

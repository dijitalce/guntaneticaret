import { describe, expect, it } from "vitest";
import { seoCategory } from "@guntan/types";
import { INFERRED_CATEGORIES, inferCategory } from "./category-from-name";

const slug = (name: string) => inferCategory(name)?.slug ?? null;

describe("inferCategory", () => {
  it("parça türünü Türkçe harf ve yazım farklarına rağmen bulur", () => {
    expect(slug("ÖN FREN BALATASI HYUNDAI İ30 1.6L")).toBe("fren-balatasi");
    expect(slug("FREN DISKI ON SOL BMW F07 F10")).toBe("fren-diski");
    expect(slug("FREM HORTUMU SUZUKI SAMURAI")).toBe("fren-hortumu");
    expect(slug("HAVA FİLTRESİ TOYOTA")).toBe("hava-filtresi");
    expect(slug("AMORTİSÖR ARKA SAĞ TOYOTA COROLLA")).toBe("amortisor");
    expect(slug("water pump")).toBe("isitma-devirdaim");
    expect(slug("ROTBAŞI ÖN DIŞ LAND ROVER")).toBe("rot-basi");
  });

  it("özel ifade genel olandan önce gelir", () => {
    expect(slug("SİLİNDİR KAPAK CONTASI VW 2.0 TDI")).toBe("conta-sibop-lastik");
    expect(slug("SILINDIR KAPAGI")).toBe("silindir-kapagi");
    expect(slug("AMORTİSÖR KÖRÜĞÜ BMW")).toBe("amortisor-kule-rulman");
    expect(slug("MOTOR KAPUT AMORTİSÖRÜ OPEL VECTRA C")).toBe("bagaj-amortisoru");
    expect(slug("RADYATOR HORTUMU ALT")).toBe("motor-su-hortumu");
    expect(slug("KLIMA RADYATORU MINI R50")).toBe("isitma-klima-rad");
    expect(slug("KRANK MİLİ SENSÖRÜ CLIO IV")).toBe("sensor");
    expect(slug("KRANK MILI KECESI")).toBe("kece-aksami");
    expect(slug("DEBRIYAJ RULMANI")).toBe("rl-debriyaj");
    expect(slug("KAYIŞ GERGİSİ FORD MONDEO")).toBe("rl-gergi");
    expect(slug("TAKOZ MOTOR PASSAT 04-10 (SANZIMAN) ORTA")).toBe("motor-takozu");
    expect(slug("ARKA FREN AYNASI ASTRA J")).toBe("fren-aksami-muhtelif");
    expect(slug("EGZOZ SUPABI OPEL")).toBe("supap");
  });

  it("ek almış sözcükleri parça saymaz", () => {
    expect(slug("DIŞ DİKİZ AYNASI SAĞ SENSÖRLÜ OPEL VIVARO")).toBe("ayna");
    expect(slug("YAĞ KARTERİ MÜŞÜRLÜ VW TRANSPORTER")).toBe("motor-aksami");
    expect(slug("KAPI GERGİ YAYI ARKA")).toBe("kapi-aksami");
  });

  it("emin olunamayan adları kategorisiz bırakır", () => {
    expect(inferCategory("255/45R20 105V XL BİNEK YAZ LASTİĞİ")).toBeNull();
    expect(inferCategory("E4ONFRBALA")).toBeNull();
    expect(inferCategory("TR5495742")).toBeNull();
    expect(inferCategory("")).toBeNull();
  });

  it("üst grubu ve adı SEO haritasından alır", () => {
    expect(inferCategory("FREN BALATASI")).toEqual({
      slug: "fren-balatasi",
      name: "Fren Balataları",
      parentSlug: "fren-aksami",
      parentName: "Fren Sistemi",
    });
    expect(inferCategory("YAKIT HORTUMU")).toMatchObject({ slug: "hortum", parentSlug: "kaucuk", parentName: "Kauçuk Parçalar" });
    expect(inferCategory("ŞANZIMAN RULMANI")).toMatchObject({ parentSlug: "sanzuman", parentName: seoCategory("sanzuman")!.name });
  });

  it("her hedef kategorinin adı vardır ve üst grubu en üst düzeydedir", () => {
    expect(INFERRED_CATEGORIES.length).toBeGreaterThan(80);
    for (const c of INFERRED_CATEGORIES) {
      expect(c.name).toBeTruthy();
      if (c.parentSlug) expect(c.parentName).toBeTruthy();
    }
  });
});

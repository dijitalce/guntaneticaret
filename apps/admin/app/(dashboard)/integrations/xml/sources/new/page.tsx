import Link from "next/link";
import { FeedConnectionFields } from "@/src/feed-source-form";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Yeni XML kaynağı" };
export const dynamic = "force-dynamic";

export default async function NewXmlSource({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="form-page is-wide">
      <PageHeader
        title="Yeni XML kaynağı"
        description="Tedarikçinin XML bağlantısını girin; sistem bağlanıp ürün alanlarını otomatik algılar, sonra eşleştirmeyi onaylarsınız."
        crumbs={[{ label: "XML senkron", href: "/integrations/xml" }]}
      />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <Panel padded>
        <form action={withBase("/api/xml-sources")} method="post" className="form-stack">
          <FeedConnectionFields />
          <div className="form-actions">
            <Link className="btn btn-ghost" href="/integrations/xml">
              Vazgeç
            </Link>
            <button className="btn btn-primary" type="submit">
              Bağlan ve alanları algıla
            </button>
          </div>
        </form>
      </Panel>
      <Panel title="Nasıl çalışır?" padded>
        <ol className="text-sm" style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.7 }}>
          <li>Sunucu XML adresine bağlanır, ürün listesini ve alanlarını (stok kodu, ad, fiyat, stok…) algılar.</li>
          <li>Önerilen alan eşleştirmesini, para birimini, KDV ve kâr marjı ayarını kontrol edip kaydedersiniz.</li>
          <li>Kaynak aktif edilince 12 saatte bir diğer tedarikçilerle birlikte otomatik güncellenir.</li>
          <li>Aynı OEM + marka birden fazla tedarikçide varsa stokta olan ve en ucuz olan satışta kalır.</li>
        </ol>
      </Panel>
    </div>
  );
}

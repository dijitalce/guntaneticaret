import { cookies } from "next/headers";
import { COOKIE_CART } from "@guntan/config";
import { getCartView, getOrCreateCart } from "@guntan/ecommerce";
import { getTenant } from "../../src/tenant";
import Link from "next/link";

export default async function CartPage() {
  const tenant = await getTenant();
  const jar = await cookies();
  const sessionId = jar.get(COOKIE_CART)?.value;
  if (!sessionId) {
    return (
      <div className="container page-surface">
        <div className="empty-state">
          <h1>Sepetin boş</h1>
          <p>Marka ve model seçerek aracına uygun parçayı ekleyebilirsin.</p>
          <Link className="btn btn-primary" href="/">Alışverişe başla</Link>
        </div>
      </div>
    );
  }
  const cart = await getOrCreateCart(tenant.tenant.id, null, sessionId);
  const view = await getCartView(cart.id);
  if (view.items.length === 0) {
    return (
      <div className="container page-surface">
        <div className="empty-state">
          <h1>Sepetin boş</h1>
          <p>Marka ve model seçerek aracına uygun parçayı ekleyebilirsin.</p>
          <Link className="btn btn-primary" href="/">Alışverişe başla</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="container page-surface cart-page">
      <h1>Sepet</h1>
      <div className="cart-layout">
        <div>
          {view.items.map((i) => (
            <div key={i.id} className="cart-row">
              <div>
                <Link href={`/urun/${i.slug}`}><strong>{i.name}</strong></Link>
                <p>{i.sku} · {i.qty} adet</p>
              </div>
              <strong>{(Number(i.price) * i.qty).toLocaleString("tr-TR")} TL</strong>
            </div>
          ))}
        </div>
        <aside className="cart-summary">
          <h2>Özet</h2>
          <p>Ara toplam <strong>{view.subtotal.toLocaleString("tr-TR")} TL</strong></p>
          <p className="muted">Kargo sipariş sonrası hesaplanır.</p>
          <Link className="btn btn-primary" href="/odeme">Ödemeye geç</Link>
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE_CART } from "@guntan/config";
import { getCartView, getOrCreateCart } from "@guntan/ecommerce";
import { getTenant } from "../../src/tenant";
import { CheckoutForm } from "./form";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const jar = await cookies();
  const sessionId = jar.get(COOKIE_CART)?.value;
  const placeholder = tenant.placeholderImageUrl ?? "/placeholder-product.jpg";

  if (!sessionId) {
    return (
      <div className="container page-surface">
        <nav className="breadcrumb">
          <Link href="/">Ana Sayfa</Link> › Ödeme
        </nav>
        <div className="empty-state">
          <h1>Sepet boş</h1>
          <p>Ödemeye geçmek için önce sepete ürün ekle.</p>
          <Link className="btn btn-primary" href="/">
            Alışverişe başla
          </Link>
        </div>
      </div>
    );
  }

  const cart = await getOrCreateCart(tenant.tenant.id, null, sessionId);
  const view = await getCartView(cart.id);

  if (view.items.length === 0) {
    return (
      <div className="container page-surface">
        <nav className="breadcrumb">
          <Link href="/">Ana Sayfa</Link> › Ödeme
        </nav>
        <div className="empty-state">
          <h1>Sepet boş</h1>
          <p>Ödemeye geçmek için önce sepete ürün ekle.</p>
          <Link className="btn btn-primary" href="/sepet">
            Sepete git
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-surface checkout-page">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › <Link href="/sepet">Sepet</Link> › Ödeme
      </nav>
      <div className="cart-head">
        <div>
          <h1>Ödeme</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            Havale / EFT · KDV dahil · {view.items.reduce((s, i) => s + i.qty, 0)} ürün
          </p>
        </div>
      </div>

      <ol className="checkout-steps" aria-label="Sipariş adımları">
        <li>
          <Link href="/sepet">1. Sepet</Link>
        </li>
        <li className="is-current">2. Ödeme</li>
        <li>3. Onay</li>
      </ol>

      {sp.hata === "1" && (
        <p className="account-alert is-bad" role="alert">
          Sipariş oluşturulamadı. Stok veya form alanlarını kontrol edip tekrar dene.
        </p>
      )}

      <CheckoutForm
        items={view.items.map((i) => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          qty: i.qty,
          price: i.price,
          imageUrl: i.imageUrl,
        }))}
        subtotal={view.subtotal}
        placeholder={placeholder}
      />
    </div>
  );
}

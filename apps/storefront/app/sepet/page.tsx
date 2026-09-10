import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { COOKIE_CART } from "@guntan/config";
import { getCartView, getOrCreateCart } from "@guntan/ecommerce";
import { getTenant } from "../../src/tenant";

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function EmptyCart() {
  return (
    <div className="container page-surface">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › Sepet
      </nav>
      <div className="empty-state">
        <h1>Sepetin boş</h1>
        <p>Marka ve model seçerek aracına uygun parçayı ekleyebilirsin.</p>
        <Link className="btn btn-primary" href="/">
          Alışverişe başla
        </Link>
      </div>
    </div>
  );
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const jar = await cookies();
  const sessionId = jar.get(COOKIE_CART)?.value;
  if (!sessionId) return <EmptyCart />;

  const cart = await getOrCreateCart(tenant.tenant.id, null, sessionId);
  const view = await getCartView(cart.id);
  if (view.items.length === 0) return <EmptyCart />;

  const itemCount = view.items.reduce((sum, i) => sum + i.qty, 0);
  const placeholder = tenant.placeholderImageUrl ?? "/placeholder-product.jpg";

  return (
    <div className="container page-surface cart-page">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › Sepet
      </nav>
      <div className="cart-head">
        <h1>Sepet</h1>
        <p className="muted">
          {itemCount} ürün · KDV dahil fiyat
        </p>
      </div>

      {sp.hata === "stok" && (
        <p className="account-alert is-bad" role="alert">
          İstediğin adet stokta yok. Adeti düşürüp tekrar dene.
        </p>
      )}

      <div className="cart-layout">
        <div className="cart-lines" aria-label="Sepet ürünleri">
          {view.items.map((i) => {
            const unit = Number(i.price);
            const line = unit * i.qty;
            const img = i.imageUrl || placeholder;
            return (
              <article key={i.id} className="cart-row">
                <Link className="cart-thumb" href={`/urun/${i.slug}`}>
                  <Image src={img} alt="" width={96} height={96} />
                </Link>
                <div className="cart-row-main">
                  <Link className="cart-row-name" href={`/urun/${i.slug}`}>
                    {i.name}
                  </Link>
                  <p className="cart-row-meta">
                    <span>{i.sku}</span>
                    <span>·</span>
                    <span>Birim {money(unit)}</span>
                  </p>
                  <div className="cart-row-actions">
                    <div className="qty-stepper" role="group" aria-label="Adet">
                      <form action="/api/cart" method="post">
                        <input type="hidden" name="action" value="update" />
                        <input type="hidden" name="itemId" value={i.id} />
                        <input type="hidden" name="qty" value={Math.max(0, i.qty - 1)} />
                        <button type="submit" aria-label="Adeti azalt">
                          −
                        </button>
                      </form>
                      <span aria-live="polite">{i.qty}</span>
                      <form action="/api/cart" method="post">
                        <input type="hidden" name="action" value="update" />
                        <input type="hidden" name="itemId" value={i.id} />
                        <input type="hidden" name="qty" value={i.qty + 1} />
                        <button type="submit" aria-label="Adeti artır">
                          +
                        </button>
                      </form>
                    </div>
                    <form action="/api/cart" method="post">
                      <input type="hidden" name="action" value="remove" />
                      <input type="hidden" name="itemId" value={i.id} />
                      <button className="cart-remove" type="submit">
                        Kaldır
                      </button>
                    </form>
                  </div>
                </div>
                <div className="cart-row-total">
                  <strong>{money(line)}</strong>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="cart-summary">
          <h2>Sipariş özeti</h2>
          <dl className="cart-summary-rows">
            <div>
              <dt>Ürün ({itemCount})</dt>
              <dd>{money(view.subtotal)}</dd>
            </div>
            <div>
              <dt>Kargo</dt>
              <dd>Sipariş sonrası</dd>
            </div>
            <div className="is-total">
              <dt>Ödenecek</dt>
              <dd>{money(view.subtotal)}</dd>
            </div>
          </dl>
          <p className="cart-summary-note muted">KDV dahil · Havale / EFT ile ödeme</p>
          <Link className="btn btn-primary" href="/odeme">
            Ödemeye geç
          </Link>
          <Link className="cart-continue" href="/">
            Alışverişe devam et
          </Link>
          <ul className="cart-trust">
            <li>KDV dahil fiyat</li>
            <li>Havale / EFT güvenli ödeme</li>
            <li>Stok siparişte rezerve edilir</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

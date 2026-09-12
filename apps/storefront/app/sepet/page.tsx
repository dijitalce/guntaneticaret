import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { COOKIE_CART } from "@guntan/config";
import { getCartSummary, getOrCreateCart } from "@guntan/ecommerce";
import { getTenant } from "../../src/tenant";
import { getCurrentCustomer } from "../../src/customer";
import { FreeShippingBar } from "../../src/cart-drawer";

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
  searchParams: Promise<{ hata?: string; giris?: string; uyelik?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const user = await getCurrentCustomer();
  const jar = await cookies();
  const sessionId = jar.get(COOKIE_CART)?.value;
  if (!sessionId && !user) return <EmptyCart />;

  await getOrCreateCart(tenant.tenant.id, user?.id, sessionId);
  const view = await getCartSummary(tenant.tenant.id, sessionId, user?.id);
  if (view.items.length === 0) return <EmptyCart />;

  const itemCount = view.qty;
  const placeholder = tenant.placeholderImageUrl ?? "/placeholder-product.jpg";
  const grand = view.subtotal + view.shippingAmount;

  return (
    <div className="container page-surface cart-page">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › Sepet
      </nav>
      <div className="cart-head">
        <h1>Sepet</h1>
        <p className="muted">
          {itemCount} ürün · KDV dahil fiyat
          {user ? ` · ${user.firstName}` : null}
        </p>
      </div>

      {(sp.giris === "1" || sp.uyelik === "1") && (
        <p className="account-alert is-ok" role="status">
          {sp.uyelik === "1"
            ? "Hesabın oluşturuldu. Sepetin hesabına bağlandı."
            : "Giriş yaptın. Sepetin hesabına bağlandı."}
        </p>
      )}

      <div className="cart-ship-banner">
        <FreeShippingBar
          subtotal={view.subtotal}
          freeShippingMin={view.freeShippingMin}
          remainingForFreeShipping={view.remainingForFreeShipping}
          freeShippingUnlocked={view.freeShippingUnlocked}
        />
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
              <dd>{view.shippingAmount <= 0 ? "Ücretsiz" : money(view.shippingAmount)}</dd>
            </div>
            <div className="is-total">
              <dt>Ödenecek</dt>
              <dd>{money(grand)}</dd>
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
            <li>{view.freeShippingMin.toLocaleString("tr-TR")} TL üzeri ücretsiz kargo</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

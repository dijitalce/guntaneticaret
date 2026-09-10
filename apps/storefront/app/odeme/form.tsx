import Image from "next/image";
import Link from "next/link";

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export type CheckoutLine = {
  id: string;
  name: string;
  slug: string;
  qty: number;
  price: string;
  imageUrl: string | null;
};

export function CheckoutForm({
  items,
  subtotal,
  placeholder,
}: {
  items: CheckoutLine[];
  subtotal: number;
  placeholder: string;
}) {
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="checkout-layout">
      <section className="checkout-form-card">
        <h2>Teslimat bilgileri</h2>
        <form className="checkout-form-grid" action="/api/checkout" method="post" id="checkout-form">
          <label>
            Ad soyad
            <input className="input" name="fullName" autoComplete="name" required />
          </label>
          <div className="checkout-form-row">
            <label>
              E-posta
              <input className="input" type="email" name="email" autoComplete="email" required />
            </label>
            <label>
              Telefon
              <input className="input" name="phone" autoComplete="tel" required />
            </label>
          </div>
          <div className="checkout-form-row">
            <label>
              İl
              <input className="input" name="city" autoComplete="address-level1" required />
            </label>
            <label>
              İlçe
              <input className="input" name="district" autoComplete="address-level2" required />
            </label>
          </div>
          <label>
            Adres
            <textarea className="input" name="line1" autoComplete="street-address" required />
          </label>
        </form>
      </section>

      <aside className="checkout-summary-card">
        <h2>Sipariş özeti</h2>
        <div className="checkout-mini-list">
          {items.map((i) => (
            <div key={i.id} className="checkout-mini-item">
              <Image src={i.imageUrl || placeholder} alt="" width={56} height={56} />
              <div>
                <strong>
                  <Link href={`/urun/${i.slug}`}>{i.name}</Link>
                </strong>
                <span>
                  {i.qty} adet · {money(Number(i.price))}
                </span>
              </div>
              <em>{money(Number(i.price) * i.qty)}</em>
            </div>
          ))}
        </div>
        <dl className="cart-summary-rows">
          <div>
            <dt>Ürün ({itemCount})</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          <div>
            <dt>Kargo</dt>
            <dd>Sipariş sonrası</dd>
          </div>
          <div className="is-total">
            <dt>Ödenecek</dt>
            <dd>{money(subtotal)}</dd>
          </div>
        </dl>
        <p className="cart-summary-note muted">Ödeme Havale / EFT ile yapılır. Kart tahsilatı yoktur.</p>
        <button className="btn btn-primary" type="submit" form="checkout-form">
          Siparişi oluştur
        </button>
        <Link className="cart-continue" href="/sepet">
          Sepete dön
        </Link>
      </aside>
    </div>
  );
}

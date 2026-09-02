import { cookies } from "next/headers";
import { COOKIE_CART } from "@guntan/config";
import { getCartView, getOrCreateCart } from "@guntan/ecommerce";
import { getTenant } from "../../src/tenant";
import { CheckoutForm } from "./form";

export default async function CheckoutPage() {
  const tenant = await getTenant();
  const jar = await cookies();
  const sessionId = jar.get(COOKIE_CART)?.value;
  if (!sessionId) {
    return <div className="container page-surface"><h1>Ödeme</h1><p>Sepet boş.</p></div>;
  }
  const cart = await getOrCreateCart(tenant.tenant.id, null, sessionId);
  const view = await getCartView(cart.id);
  return (
    <div className="container page-surface">
      <h1>Ödeme — Havale / EFT</h1>
      <p>Kart ödemesi yok. Sipariş sonrası IBAN bilgisi gösterilir.</p>
      <p>Ara toplam: {view.subtotal.toLocaleString("tr-TR")} TL</p>
      <CheckoutForm />
    </div>
  );
}

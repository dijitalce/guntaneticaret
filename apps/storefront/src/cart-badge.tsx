import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE_CART } from "@guntan/config";
import { cartQty } from "@guntan/ecommerce";
import { IconCart } from "./icons";

export async function CartBadge({ tenantId }: { tenantId: string }) {
  const qty = await cartQty(tenantId, (await cookies()).get(COOKIE_CART)?.value);
  return (
    <Link className="icon-btn cart-chip" href="/sepet">
      <IconCart />
      <span>Sepet</span>
      {qty > 0 && <em>{qty}</em>}
    </Link>
  );
}

export function CartBadgeFallback() {
  return (
    <Link className="icon-btn cart-chip" href="/sepet" aria-busy="true">
      <IconCart />
      <span>Sepet</span>
    </Link>
  );
}

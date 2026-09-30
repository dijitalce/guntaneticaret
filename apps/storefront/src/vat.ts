/** Site fiyatları KDV dahildir; tüm ürün ve kargo %20 KDV'ye tabi. */
export const VAT_RATE = 20;

/** KDV dahil tutarın içindeki KDV ve KDV hariç tutar (kuruşa yuvarlı). */
export function vatBreakdown(grossTotal: number) {
  const net = Math.round((grossTotal / (1 + VAT_RATE / 100)) * 100) / 100;
  const vat = Math.round((grossTotal - net) * 100) / 100;
  return { net, vat };
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LISTING_SORT } from "@guntan/types";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next && next !== LISTING_SORT.RECOMMENDED) {
      params.set("sort", next);
    } else {
      params.delete("sort");
    }
    params.delete("page");
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <form className="sort-form">
      <label>
        Sırala
        <select
          className="select"
          name="sort"
          defaultValue={value}
          onChange={(e) => onChange(e.currentTarget.value)}
        >
          <option value={LISTING_SORT.RECOMMENDED}>Önerilen</option>
          <option value={LISTING_SORT.PRICE_ASC}>Fiyat artan</option>
          <option value={LISTING_SORT.PRICE_DESC}>Fiyat azalan</option>
          <option value={LISTING_SORT.NEW}>Yeni</option>
          <option value={LISTING_SORT.BESTSELLER}>Çok satan</option>
        </select>
      </label>
    </form>
  );
}

"use client";

import { LISTING_SORT } from "@guntan/types";

export function SortSelect({ value }: { value: string }) {
  return (
    <form className="sort-form">
      <label>
        Sırala
        <select
          className="select"
          name="sort"
          defaultValue={value}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
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

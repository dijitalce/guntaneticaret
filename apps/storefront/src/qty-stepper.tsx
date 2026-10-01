"use client";

import { useState } from "react";

export function QtyStepper({ name = "qty", max }: { name?: string; max?: number }) {
  const [qty, setQty] = useState(1);
  const limit = max && max > 0 ? max : 999;
  const set = (n: number) => setQty(Math.min(limit, Math.max(1, Math.round(n) || 1)));

  return (
    <div className="qty-stepper">
      <button type="button" aria-label="Azalt" onClick={() => set(qty - 1)} disabled={qty <= 1}>
        −
      </button>
      <input
        type="number"
        name={name}
        aria-label="Adet"
        inputMode="numeric"
        min={1}
        max={limit}
        value={qty}
        onChange={(e) => set(Number(e.target.value))}
      />
      <button type="button" aria-label="Artır" onClick={() => set(qty + 1)} disabled={qty >= limit}>
        +
      </button>
    </div>
  );
}

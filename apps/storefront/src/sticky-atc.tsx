"use client";

import { useEffect, useState } from "react";

export function StickyAtc({ targetId, formId, price }: { targetId: string; formId: string; price: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry) setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  return (
    <div className={`sticky-atc${show ? " is-visible" : ""}`} aria-hidden={!show}>
      <div className="sticky-atc-price">
        <strong>{price}</strong>
        <small>KDV dahil</small>
      </div>
      <button className="btn btn-primary" type="submit" form={formId} tabIndex={show ? 0 : -1}>
        Sepete ekle
      </button>
    </div>
  );
}

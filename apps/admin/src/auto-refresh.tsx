"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

export function AutoRefresh({ everyMs = 3000 }: { everyMs?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  pendingRef.current = pending;
  useEffect(() => {
    // Yavaş yanıtlarda istekler üst üste binmesin; arka plandaki sekme sunucuyu yormasın.
    const t = setInterval(() => {
      if (document.hidden || pendingRef.current) return;
      startTransition(() => router.refresh());
    }, everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}

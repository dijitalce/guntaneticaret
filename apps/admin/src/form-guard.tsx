"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { withBase } from "./paths";

/** `tr[data-href]` satırının boş bir yerine tıklanınca detaya gider; satırdaki buton/link/kutucuklar kendi işini yapar. */
export function RowLinks() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || e.defaultPrevented || e.button !== 0) return;
      if (target.closest("a, button, input, select, textarea, label, summary, form")) return;
      if (window.getSelection()?.toString()) return;
      const row = target.closest<HTMLElement>("tr[data-href]");
      const href = row?.dataset.href;
      if (!href) return;
      if (e.metaKey || e.ctrlKey) window.open(withBase(href), "_blank");
      else router.push(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);
  return null;
}

/** Gönderilen formun butonlarını kilitler; çift tıklamayla iki kez onay/e-posta gitmesini önler. */
export function FormGuard() {
  useEffect(() => {
    const locked = new Set<HTMLButtonElement>();
    const release = () => {
      for (const b of locked) {
        b.disabled = false;
        b.classList.remove("is-pending");
      }
      locked.clear();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if ((form.method || "get").toLowerCase() !== "post" || form.target === "_blank" || form.dataset.noGuard !== undefined) return;
      const submitter = e.submitter instanceof HTMLButtonElement ? e.submitter : null;
      setTimeout(() => {
        if (e.defaultPrevented) return;
        for (const b of form.querySelectorAll<HTMLButtonElement>('button[type="submit"], button:not([type])')) {
          b.disabled = true;
          locked.add(b);
        }
        submitter?.classList.add("is-pending");
        setTimeout(release, 20_000);
      }, 0);
    };
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", release);
    return () => {
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", release);
    };
  }, []);
  return null;
}

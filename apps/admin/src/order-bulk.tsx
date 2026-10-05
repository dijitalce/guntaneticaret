"use client";

import { useEffect, useState } from "react";
import { IconPrinter } from "./icons";

const selector = (form: string) => `input[type="checkbox"][name="ids"][form="${form}"]`;

/** Seçili sipariş yoksa etiket butonu kapalı kalır; boş seçimle 404 sekmesi açılmaz. */
export function BulkLabelButton({ form }: { form: string }) {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const update = () => setSelected(document.querySelectorAll(`${selector(form)}:checked`).length);
    update();
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, [form]);
  return (
    <button className="btn btn-secondary" type="submit" form={form} disabled={selected === 0} title={selected ? undefined : "Önce listeden sipariş seçin"}>
      <IconPrinter />
      {selected ? `${selected} siparişin etiketini yazdır` : "Seçilenlerin etiketini yazdır"}
    </button>
  );
}

export function SelectAllOrders({ form }: { form: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <input
      type="checkbox"
      aria-label="Sayfadaki tüm siparişleri seç"
      checked={checked}
      onChange={(e) => {
        setChecked(e.target.checked);
        for (const box of document.querySelectorAll<HTMLInputElement>(selector(form))) box.checked = e.target.checked;
        document.dispatchEvent(new Event("change"));
      }}
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./icons";

import { THEME_KEY as KEY } from "./theme-init";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {}
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? "Açık moda geç" : "Koyu moda geç"} title={dark ? "Açık mod" : "Koyu mod"}>
      {dark ? <IconSun /> : <IconMoon />}
    </button>
  );
}

export const THEME_KEY = "admin-theme";

/** Kayıtlı tercih yoksa sistem temasını izler; ilk boyamadan önce çalışır. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(!t&&matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;


import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function getStored(): Theme {
  try {
    const v = localStorage.getItem("kv_dark_mode");
    if (v === "dark" || v === "light") return v;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  try { localStorage.setItem("kv_dark_mode", theme); } catch { /* noop */ }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStored);

  useEffect(() => { applyTheme(theme); }, [theme]);

  function toggle() {
    setTheme(t => (t === "dark" ? "light" : "dark"));
  }

  return { theme, toggle };
}

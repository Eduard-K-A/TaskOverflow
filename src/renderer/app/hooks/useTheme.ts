import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";

export const useTheme = () => {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (mql.matches ? "dark" : "light") : theme;
      setResolvedTheme(resolved);
      root.classList.toggle("dark", resolved === "dark");
    };
    apply();
    if (theme === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme]);

  return { theme, setTheme, resolvedTheme };
};

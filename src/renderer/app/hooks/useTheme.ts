import { useEffect } from "react";
import { useStore } from "../store/useStore";

export const useTheme = () => {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (mql.matches ? "dark" : "light") : theme;
      root.classList.toggle("dark", resolved === "dark");
    };
    apply();
    if (theme === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme]);

  return { theme, setTheme };
};

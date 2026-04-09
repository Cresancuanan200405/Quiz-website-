"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/themeStore";

export default function ThemeHydrator() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      const root = document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    }, 0);

    return () => window.clearTimeout(kickoff);
  }, [theme]);

  return null;
}

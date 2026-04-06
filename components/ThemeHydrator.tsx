"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/themeStore";

export default function ThemeHydrator() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  return null;
}

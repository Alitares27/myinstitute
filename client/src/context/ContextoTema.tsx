import React, { createContext, useContext, useEffect, useState } from "react";
import { hideAndroidSplash, updateAndroidSystemColors } from "../native/androidShell";

type Theme = "light" | "dark";
type ThemePreference = Theme | "system";

interface ThemeContextType {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  });
  const [systemTheme, setSystemTheme] = useState<Theme>(() => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const theme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    if (preference === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", preference);
  }, [preference]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    const probe = document.createElement("span");
    probe.style.color = "AccentColor";
    document.body.appendChild(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", accent);
    void updateAndroidSystemColors(accent, theme === "dark").finally(() => hideAndroidSplash());
  }, [theme]);

  const toggleTheme = () => {
    setPreference(theme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? "dark" : "light");
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

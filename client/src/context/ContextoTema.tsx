import React, { createContext, useContext, useEffect, useState } from "react";
import { hideAndroidSplash, updateAndroidSystemColors } from "../native/androidShell";
import { ACCENT_COLORS, FONT_FAMILIES, readAppearance } from "../shared/appearance";
import type { Appearance } from "../shared/appearance";

type Theme = "light" | "dark";
type ThemePreference = Theme | "system";

interface ThemeContextType {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appearance,setAppearance]=useState<Appearance>(readAppearance);
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
    const updateSystemColors=()=>{
      if(document.visibilityState==="hidden")return;
      const probe = document.createElement("span");
      probe.style.color = "AccentColor";
      document.body.appendChild(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", accent);
      void updateAndroidSystemColors(accent, theme === "dark").finally(() => hideAndroidSplash());
    };
    updateSystemColors();
    document.addEventListener("visibilitychange",updateSystemColors);
    return()=>document.removeEventListener("visibilitychange",updateSystemColors);
  }, [theme]);

  useEffect(()=>{
    localStorage.setItem("appearance",JSON.stringify({...appearance,paletteVersion:2}));
    const root=document.documentElement;
    const device=root.classList.contains("native-android")&&appearance.deviceColors;
    const color=ACCENT_COLORS[appearance.buttonColor][theme];
    const icon=ACCENT_COLORS[appearance.iconColor][theme];
    const primary=device?`var(--android-primary, ${color})`:color;
    const onPrimary=device?"var(--android-on-primary, #FFFFFF)":theme==="dark"?"#111111":"#FFFFFF";
    const tokens:Record<string,string>={
      "--primary":primary,"--primary-accent":primary,"--button-primary":primary,"--button-on-primary":onPrimary,
      "--primary-hover":`color-mix(in srgb, ${primary} 88%, var(--text-main))`,"--primary-dark":primary,
      "--primary-light":`color-mix(in srgb, ${primary} 12%, var(--bg-surface))`,
      "--sidebar-active-bg":primary,"--sidebar-active-text":onPrimary,"--icon-color":device?primary:icon,
      "--app-font":FONT_FAMILIES[appearance.font],"--app-text-scale":appearance.textSize==="large"?"112.5%":"100%",
    };
    for(const [key,value] of Object.entries(tokens))root.style.setProperty(key,value);
    if(!device&&appearance.fontColor>=0)root.style.setProperty("--text-main",ACCENT_COLORS[appearance.fontColor][theme]);
    else root.style.removeProperty("--text-main");
  },[appearance,theme]);

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
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme, appearance, setAppearance }}>
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

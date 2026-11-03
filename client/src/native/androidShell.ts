import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

let initialized = false;

interface AndroidSystemColorResult {
  primary: string;
  onPrimary: string;
  surface: string;
}

const AndroidSystemColors = registerPlugin<{ getColors(): Promise<AndroidSystemColorResult> }>("AndroidSystemColors");

function toHex(color: string): string {
  const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgb) return /^#[0-9a-f]{6}$/i.test(color) ? color : "#6750A4";
  return `#${rgb.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

export async function initializeAndroidShell(): Promise<void> {
  if (initialized || Capacitor.getPlatform() !== "android") return;
  initialized = true;

  await Promise.all([
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined),
    StatusBar.setStyle({ style: Style.Default }).catch(() => undefined),
  ]);

  await App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.exitApp();
  });
}

export async function updateAndroidSystemColors(accent: string, dark: boolean): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  let colors: AndroidSystemColorResult = { primary: toHex(accent), onPrimary: "#FFFFFF", surface: dark ? "#1C1B1F" : "#F2F2F7" };
  try { colors = await AndroidSystemColors.getColors(); } catch { /* Keep the browser palette if native color lookup is unavailable. */ }
  const root = document.documentElement;
  root.style.setProperty("--android-primary", colors.primary);
  root.style.setProperty("--android-on-primary", colors.onPrimary);
  root.style.setProperty("--android-surface", colors.surface);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.primary);
  await Promise.all([
    StatusBar.setBackgroundColor({ color: colors.primary }).catch(() => undefined),
    StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark }).catch(() => undefined),
  ]);
}

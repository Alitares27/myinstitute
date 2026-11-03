import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

let initialized = false;
let splashHidePromise: Promise<void> | undefined;

interface AndroidSystemColorResult {
  primary: string;
  onPrimary: string;
  surface: string;
}

const AndroidSystemColors = registerPlugin<{
  getColors(): Promise<AndroidSystemColorResult>;
}>("AndroidSystemColors");

function toHex(color: string): string {
  const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgb) return /^#[0-9a-f]{6}$/i.test(color) ? color : "#6750A4";
  return `#${rgb.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

export async function initializeAndroidShell(): Promise<void> {
  if (initialized || Capacitor.getPlatform() !== "android") return;
  initialized = true;
  document.documentElement.classList.add("native-android");
  window.setTimeout(() => { void hideAndroidSplash(); }, 10_000);

  await Promise.all([
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined),
    StatusBar.setStyle({ style: Style.Default }).catch(() => undefined),
  ]);

  await App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.exitApp();
  });
}

export function hideAndroidSplash(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return Promise.resolve();
  if (!splashHidePromise) {
    splashHidePromise = SplashScreen.hide().catch(() => { splashHidePromise = undefined; });
  }
  return splashHidePromise;
}

export async function updateAndroidSystemColors(accent: string, dark: boolean): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  let colors: AndroidSystemColorResult = { primary: toHex(accent), onPrimary: "#FFFFFF", surface: dark ? "#1C1B1F" : "#F2F2F7" };
  try {
    colors = await AndroidSystemColors.getColors();
  } catch { /* Keep the web palette if native Android theming is unavailable. */ }
  const root = document.documentElement;
  root.style.setProperty("--android-primary", colors.primary);
  root.style.setProperty("--android-on-primary", colors.onPrimary);
  const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (systemIsDark === dark) {
    root.style.setProperty("--android-surface", colors.surface);
  } else {
    // Keep an explicit in-app theme from inheriting a surface color for the opposite Android mode.
    root.style.removeProperty("--android-surface");
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.primary);
  await Promise.all([
    StatusBar.setBackgroundColor({ color: colors.primary }).catch(() => undefined),
    StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark }).catch(() => undefined),
  ]);
}

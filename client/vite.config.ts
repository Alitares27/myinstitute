import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { pwa } from "./pwa";

export default defineConfig(({ mode }) => {
  const androidBuild = mode === "android";
  const env = loadEnv(mode, process.cwd(), "");

  if (androidBuild) {
    const apiUrl = env.VITE_API_URL?.trim();
    if (!apiUrl) {
      throw new Error("Define VITE_API_URL en client/.env.android.local antes de preparar Android.");
    }
    let parsedApiUrl: URL;
    try {
      parsedApiUrl = new URL(apiUrl);
    } catch {
      throw new Error("VITE_API_URL debe ser una URL absoluta, por ejemplo https://api.example.com/api.");
    }
    if (!["http:", "https:"].includes(parsedApiUrl.protocol)) {
      throw new Error("VITE_API_URL debe usar HTTP o HTTPS.");
    }
    if (["localhost", "127.0.0.1", "api.example.com"].includes(parsedApiUrl.hostname)) {
      throw new Error("VITE_API_URL debe apuntar al backend real, no a localhost ni a la URL de ejemplo.");
    }
  }

  return {
    base: androidBuild ? "./" : "/",
    resolve: {
      alias: {
        canvg: fileURLToPath(new URL("./src/utils/canvgStub.ts", import.meta.url)),
      },
    },
    plugins: [react(), ...(androidBuild ? [] : [pwa()])],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-icons": ["react-icons"],
            "vendor-http": ["axios"],
            "vendor-pdf": ["jspdf"],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});

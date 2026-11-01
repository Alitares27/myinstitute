import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { pwa } from "./pwa";

export default defineConfig({
  resolve: {
    alias: {
      canvg: fileURLToPath(new URL("./src/utils/canvgStub.ts", import.meta.url)),
    },
  },
  plugins: [
    react(),
    pwa(),
  ],
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
});

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/Global.css";
import "./styles/Tablas.css";
import "./styles/Consejos.css";
import { ThemeProvider } from "./context/ContextoTema";

const chunkReloadKey = "vite:preload-error-reload";
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();

  const lastReload = Number(sessionStorage.getItem(chunkReloadKey) || 0);
  if (Date.now() - lastReload > 30_000) {
    sessionStorage.setItem(chunkReloadKey, String(Date.now()));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

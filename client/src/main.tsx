import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/Global.css";
import "./styles/Tablas.css";
import "./styles/Consejos.css";
import { ThemeProvider } from "./context/ContextoTema";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import { limpiarSesion } from "../utils/sesion";
import { readSessionUser } from "../utils/access";
import { isTokenExpired } from "./RutaPrivada";

export default function SessionMonitor() {
  const { pathname } = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("token");
    if (!token) return;

    function expire() {
      if (controller.signal.aborted || localStorage.getItem("token") !== token) return;
      void limpiarSesion();
      window.history.replaceState(window.history.state, "", "/iniciar-sesion?sesion=expirada");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }

    function checkExpiration() {
      if (token && isTokenExpired(token)) expire();
    }

    function refresh() {
      checkExpiration();
      if (!navigator.onLine || localStorage.getItem("token") !== token) return;
      void api.get("/auth/me", { signal: controller.signal }).then(({ data }) => {
        const current = readSessionUser();
        if (!current || current.id !== data.id || current.role !== data.role ||
            current.permissions?.some(module => !data.permissions?.includes(module))) expire();
      }).catch(() => undefined);
    }

    refresh();
    window.addEventListener("online", refresh);
    const timer = window.setInterval(checkExpiration, 1000);
    return () => {
      controller.abort();
      window.removeEventListener("online", refresh);
      window.clearInterval(timer);
    };
  }, [pathname]);

  return null;
}

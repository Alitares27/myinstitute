import { isTokenExpired } from "./components/RutaPrivada";
import { limpiarSesion } from "./utils/sesion";
import axios from "axios";
import {
  cacheSuccessfulGet,
  enqueueMutation,
  readOfflineGet,
  rememberOfflineSession,
  synchronizePendingChanges,
} from "./services/offlineSync";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    void rememberOfflineSession(token);
  }
  if (!navigator.onLine) {
    const method = (config.method || "get").toLowerCase();
    (config as typeof config & { __offlineAdapter?: boolean }).__offlineAdapter = true;
    config.adapter = async (offlineConfig) => {
      if (["get", "head", "options"].includes(method)) {
        const cached = await readOfflineGet(offlineConfig);
        return { data: cached.data, status: 200, statusText: "OK (local)", headers: {}, config: offlineConfig, request: {} };
      }
      const path = offlineConfig.url || "";
      if (/\/users\/(login|register)|\/logout|\/password/.test(path)) {
        throw new Error("Esta acciÃ³n requiere conexiÃ³n a internet.");
      }
      const queued = await enqueueMutation(offlineConfig);
      return { data: queued.data, status: 202, statusText: "Guardado para sincronizar", headers: {}, config: offlineConfig, request: {} };
    };
  }
  return config;
});

api.interceptors.response.use(
  async (response) => {
    if (!(response.config as typeof response.config & { __offlineAdapter?: boolean }).__offlineAdapter && ["get", "head"].includes((response.config.method || "get").toLowerCase())) {
      const userId = (() => {
        try { return String(JSON.parse(localStorage.getItem("user") || "null")?.id ?? ""); }
        catch { return ""; }
      })();
      const token = localStorage.getItem("token");
      if (userId && token && response.config.headers.Authorization === `Bearer ${token}`) {
        await cacheSuccessfulGet(userId, response.config, response.data);
      }
    }
    return response;
  },
  async (error) => {
    const config = error.config;
    const method = (config?.method || "get").toLowerCase();

    if (!error.response && config && !config.signal?.aborted && ["get", "head", "options"].includes(method)) {
      try {
        const cached = await readOfflineGet(config);
        return { data: cached.data, status: 200, statusText: "OK (local cache)", headers: {}, config, request: {} };
      } catch {
      }
    }

    if (!error.response && config && !config.signal?.aborted && ["post", "put", "patch", "delete"].includes(method)) {
      const path = config.url || "";
      if (!/\/users\/(login|register)|\/logout|\/password/.test(path)) {
        try {
          const queued = await enqueueMutation(config);
          return { data: queued.data, status: 202, statusText: "Guardado para sincronizar", headers: {}, config, request: {} };
        } catch {
        }
      }
    }

    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      if (token && config?.headers?.Authorization === `Bearer ${token}` && isTokenExpired(token) && !config.url?.includes("/login")) {
        if (config && method === "get") {
          try {
            const cached = await readOfflineGet(config);
            return { data: cached.data, status: 200, statusText: "OK (local cache)", headers: {}, config, request: {} };
          } catch {
            throw new Error("No hay una copia local. Vuelve a iniciar sesión con conexión para actualizarla.");
          }
        }
        throw new Error("Vuelve a iniciar sesión con conexión para realizar esta acción.");
      }
      if (!error.config?.url?.includes("/login") && token && config?.headers?.Authorization === `Bearer ${token}`) {
        await limpiarSesion();
        if (window.location.pathname !== "/iniciar-sesion") {
          window.history.replaceState(window.history.state, "", "/iniciar-sesion");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      }
    }

    if (
      !error.response &&
      config &&
      !config.__isRetry &&
      ["get", "head", "options"].includes(config.method || "get")
    ) {
      config.__isRetry = true;
      await new Promise((r) => setTimeout(r, 1000));
      const retried = await api(config);
      void synchronizePendingChanges();
      return retried;
    }

    return Promise.reject(error);
  }
);

export default api;

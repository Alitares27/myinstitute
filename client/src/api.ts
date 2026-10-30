import { limpiarSesion } from "./utils/sesion";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (!error.config?.url?.includes("/login")) {
      await limpiarSesion();
      window.location.href = "/iniciar-sesion";
      }
    }

    const config = error.config;
    if (
      !error.response &&
      config &&
      !config.__isRetry &&
      ["get", "head", "options"].includes(config.method || "get")
    ) {
      config.__isRetry = true;
      await new Promise((r) => setTimeout(r, 1000));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;

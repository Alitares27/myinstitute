import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
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
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      window.location.href = "/iniciar-sesion";
    }

    const config = error.config;
    if (
      !error.response &&
      config &&
      !config.__isRetry &&
      config.method !== "post" &&
      config.method !== "put" &&
      config.method !== "delete"
    ) {
      config.__isRetry = true;
      await new Promise((r) => setTimeout(r, 1000));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
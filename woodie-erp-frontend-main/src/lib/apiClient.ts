import axios from "axios";

const TOKEN_KEY = "woodie_auth_token";

function normalizeApiBase(raw: string | undefined): string {
  if (!raw) return "http://127.0.0.1:5000/api";
  let url = raw.trim().replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    url = `${url}/api`;
  }
  return url;
}

export const api = axios.create({
  baseURL: normalizeApiBase(import.meta.env.VITE_API_BASE_URL),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("woodie_auth_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getMediaUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const apiBase = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

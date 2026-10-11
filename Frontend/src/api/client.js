import axios from "axios";

/**
 * Single HTTP client for the backend.
 *
 * - The short-lived access token lives only in memory (never in localStorage).
 * - The refresh token is an httpOnly cookie set by the backend; on a 401 the
 *   client refreshes once (concurrent requests share the same refresh) and
 *   retries the request.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const AUTH_ENDPOINTS = ["/auth/login/", "/auth/register/", "/auth/refresh/", "/auth/logout/"];

let accessToken = null;
let refreshPromise = null;
let language = "en";
let sessionExpiredHandler = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function hasAccessToken() {
  return Boolean(accessToken);
}

export function setApiLanguage(value) {
  language = value;
}

export function onSessionExpired(handler) {
  sessionExpiredHandler = handler;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 90_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  config.headers["Accept-Language"] = language;
  return config;
});

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh/`, null, { withCredentials: true, timeout: 15_000 })
      .then((response) => {
        accessToken = response.data.access;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => original?.url?.startsWith(path));
    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        const wasSignedIn = Boolean(accessToken);
        accessToken = null;
        if (wasSignedIn) sessionExpiredHandler?.();
      }
    }
    return Promise.reject(error);
  },
);

export default api;

/** Machine-readable error code returned by the API (or a client-side one). */
export function errorCode(error) {
  if (axios.isCancel(error)) return "cancelled";
  if (!error?.response) return "network_error";
  return error.response.data?.code || `http_${error.response.status}`;
}

/**
 * Human readable, translated error message.
 * Known error codes are translated; validation errors show the server's text
 * for the first invalid field; everything else falls back to ``fallbackKey``.
 */
export function errorMessage(error, t, fallbackKey = "errors.generic") {
  const code = errorCode(error);
  if (code !== "validation_error" && t.has(`errors.${code}`)) return t(`errors.${code}`);
  const data = error?.response?.data;
  if (code === "validation_error" && data?.error) return data.error;
  return t(fallbackKey);
}

/** Field errors of a validation error as ``{field: "message"}``. */
export function fieldErrors(error) {
  const fields = error?.response?.data?.fields;
  if (!fields || typeof fields !== "object") return {};
  return Object.fromEntries(
    Object.entries(fields).map(([name, messages]) => [name, Array.isArray(messages) ? messages[0] : String(messages)]),
  );
}

export function isCancel(error) {
  return axios.isCancel(error);
}

import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";

// In development the SPA talks to Django through this proxy, so the browser
// sees a single origin (no CORS, and the httpOnly refresh cookie just works).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";
  const proxy = {
    "/api": { target, changeOrigin: false },
    "/admin": { target, changeOrigin: false },
    "/static": { target, changeOrigin: false },
  };
  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    build: { sourcemap: false, target: "es2020" },
  };
});

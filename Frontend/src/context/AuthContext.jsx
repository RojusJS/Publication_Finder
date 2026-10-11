import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth";
import { onSessionExpired } from "../api/client";
import { useT } from "../i18n/LanguageContext";
import { useToast } from "./ToastContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const t = useT();
  const showToast = useToast();
  const [session, setSession] = useState({ status: "loading", user: null });
  const [authDialog, setAuthDialog] = useState(null); // "login" | "register" | null

  useEffect(() => {
    let active = true;
    authApi
      .restoreSession()
      .then((user) => active && setSession({ status: user ? "authenticated" : "anonymous", user }))
      .catch(() => active && setSession({ status: "anonymous", user: null }));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    onSessionExpired(() => {
      authApi.setSessionHint(false);
      setSession({ status: "anonymous", user: null });
      showToast(t("auth.session_expired"), "info");
    });
    return () => onSessionExpired(null);
  }, [showToast, t]);

  const login = useCallback(async (username, password) => {
    const user = await authApi.login(username, password);
    setSession({ status: "authenticated", user });
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const user = await authApi.register(payload);
    setSession({ status: "authenticated", user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setSession({ status: "anonymous", user: null });
    }
  }, []);

  const clearSession = useCallback(() => {
    authApi.setSessionHint(false);
    setSession({ status: "anonymous", user: null });
  }, []);
  const updateUser = useCallback((user) => setSession({ status: "authenticated", user }), []);

  const value = useMemo(
    () => ({
      user: session.user,
      status: session.status,
      isAuthenticated: session.status === "authenticated",
      login,
      register,
      logout,
      clearSession,
      updateUser,
      authDialog,
      openAuth: (mode = "login") => setAuthDialog(mode),
      closeAuth: () => setAuthDialog(null),
    }),
    [session, login, register, logout, clearSession, updateUser, authDialog],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

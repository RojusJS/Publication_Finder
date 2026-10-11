import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Icon from "../components/ui/Icon";
import { useT } from "../i18n/LanguageContext";

const ToastContext = createContext(null);
const MAX_TOASTS = 4;
const DURATION = { error: 6000, success: 3500, info: 4500 };

export function ToastProvider({ children }) {
  const t = useT();
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const showToast = useCallback(
    (message, kind = "error") => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-(MAX_TOASTS - 1)), { id, message, kind }]);
      window.setTimeout(() => dismiss(id), DURATION[kind] || DURATION.info);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
            <span className="toast-icon">
              <Icon name={toast.kind === "success" ? "check" : toast.kind === "info" ? "info" : "alert"} />
            </span>
            <span className="toast-message">{toast.message}</span>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => dismiss(toast.id)} aria-label={t("common.close")}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context.showToast;
}

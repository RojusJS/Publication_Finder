import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    error: "✕",
    success: "✓",
  };

  const colors = {
    error: { bg: "#1a1a1a", accent: "#e05252", label: "Klaida" },
    success: { bg: "#1a1a1a", accent: "#4caf7d" },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "28px",
          right: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          zIndex: 9999,
        }}
      >
        {toasts.map((toast) => {
          const { bg, accent, label } = colors[toast.type] || colors.error;
          return (
            <div
              key={toast.id}
              style={{
                width: "320px",
                background: bg,
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                overflow: "hidden",
                animation: "slideIn 0.25s ease",
                fontFamily: "Times New Roman",
              }}
            >
              <div
                style={{
                  height: "3px",
                  background: accent,
                  width: "100%",
                }}
              />
              <div
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    color: "#fff",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  {icons[toast.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: accent,
                      marginBottom: "3px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#e8e8e8",
                      lineHeight: "1.45",
                    }}
                  >
                    {toast.message}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

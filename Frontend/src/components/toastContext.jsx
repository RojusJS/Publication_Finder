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

  const config = {
    error: {
      accent: "#c0392b",
      bg: "#ffffff",
      iconBg: "#fff0ee",
      icon: "✕",
      label: "Klaida",
    },
    success: {
      accent: "#27744f",
      bg: "#ffffff",
      iconBg: "#e8f5ec",
      icon: "✓",
      label: "Atlikta",
    },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 99999,
        }}
      >
        {toasts.map((toast) => {
          const { accent, bg, iconBg, icon, label } =
            config[toast.type] || config.error;
          return (
            <div
              key={toast.id}
              style={{
                width: "300px",
                background: bg,
                borderRadius: "10px",
                border: "1px solid #dce3ed",
                borderLeft: `3px solid ${accent}`,
                boxShadow: "0 8px 24px rgba(30,45,74,0.12)",
                overflow: "hidden",
                animation: "toastIn 0.2s ease",
                fontFamily: "Times New Roman",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: iconBg,
                    border: `1px solid ${accent}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    color: accent,
                    flexShrink: 0,
                    fontWeight: "700",
                  }}
                >
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      color: accent,
                      marginBottom: "2px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#1e2d4a",
                      lineHeight: "1.45",
                    }}
                  >
                    {toast.message}
                  </div>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#7a90aa",
                    fontSize: "13px",
                    padding: "0",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#1e2d4a")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#7a90aa")
                  }
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

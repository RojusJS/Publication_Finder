import React from "react";
import { createPortal } from "react-dom";

function Modal({ open, onClose, title, children, maxWidth = "520px" }) {
  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,25,45,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: maxWidth,
          maxHeight: "90vh",
          background: "#ffffff",
          boxShadow: "0 20px 60px rgba(30,45,74,0.2)",
          borderRadius: "12px",
          padding: "24px",
          position: "relative",
          zIndex: 10000,
          fontFamily: "Times New Roman",
          boxSizing: "border-box",
          overflowY: "auto",
          border: "1px solid #dce3ed",
        }}
      >
        {(title || onClose) && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: title ? "20px" : 0,
              paddingBottom: title ? "16px" : 0,
              borderBottom: title ? "1px solid #eef1f6" : "none",
            }}
          >
            {title ? (
              <h2
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: "700",
                  lineHeight: "1.3",
                  flex: 1,
                  color: "#1e2d4a",
                  fontFamily: "Times New Roman",
                }}
              >
                {title}
              </h2>
            ) : (
              <div />
            )}
            <button
              onClick={onClose}
              type="button"
              style={{
                width: "28px",
                height: "28px",
                minWidth: "28px",
                borderRadius: "6px",
                border: "1px solid #dce3ed",
                background: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                fontSize: "14px",
                flexShrink: 0,
                color: "#7a90aa",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0f4fa";
                e.currentTarget.style.borderColor = "#7fa8d4";
                e.currentTarget.style.color = "#1e2d4a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.borderColor = "#dce3ed";
                e.currentTarget.style.color = "#7a90aa";
              }}
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;

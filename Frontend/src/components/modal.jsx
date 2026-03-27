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
        background: "rgba(0, 0, 0, 0.61)",
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
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          padding: "20px",
          position: "relative",
          zIndex: 10000,
          fontFamily: "Times New Roman",
          boxSizing: "border-box",
          overflowY: "auto",
          border: "2px solid #000000",
        }}
      >
        {(title || onClose) && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: title ? "18px" : 0,
            }}
          >
            {title ? (
              <h2
                style={{
                  margin: 0,
                  lineHeight: "1.3",
                  flex: 1,
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
                width: "34px",
                height: "34px",
                minWidth: "34px",
                borderRadius: "10px",
                border: "1px solid #000000",
                background: "#000000f1",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                lineHeight: 1,
                fontSize: "18px",
                flexShrink: 0,
                color: "#fff"
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

import React from "react";
import Modal from "./modal";

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Ar tikrai?",
  message,
  confirmLabel = "Patvirtinti",
  danger = true,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="400px">
      {message && (
        <p
          style={{
            margin: "0 0 24px",
            fontSize: "14px",
            color: "#5a7090",
            fontFamily: "Times New Roman",
            lineHeight: "1.5",
          }}
        >
          {message}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <button
          onClick={onClose}
          style={{
            padding: "7px 16px",
            background: "none",
            border: "1px solid #dce3ed",
            borderRadius: "6px",
            cursor: "pointer",
            fontFamily: "Times New Roman",
            fontSize: "13px",
            color: "#5a7090",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f0f4fa";
            e.currentTarget.style.borderColor = "#7fa8d4";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.borderColor = "#dce3ed";
          }}
        >
          Atšaukti
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          style={{
            padding: "7px 16px",
            background: danger ? "#c0392b" : "#1e2d4a",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontFamily: "Times New Roman",
            fontSize: "13px",
            color: "#ffffff",
            fontWeight: "600",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = danger ? "#a93226" : "#2a3f63";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = danger ? "#c0392b" : "#1e2d4a";
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmModal;

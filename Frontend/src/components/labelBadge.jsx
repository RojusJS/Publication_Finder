import React from "react";
import { updateLabel } from "../services/projectApi";

const LABEL_COLORS = {
  Cituota: { bg: "#d4edda", color: "#2a703b", border: "#a7d3b4" },
  Cituoti: { bg: "#cce5ff", color: "#185a97", border: "#94c5fa" },
  Perskaityta: { bg: "#e2d9f3", color: "#5a3e8a", border: "#c5b3e8" },
  Perskaityti: { bg: "#fff3cd", color: "#856404", border: "#ffd97d" },
};

const LABEL_OPTIONS = ["Cituota", "Cituoti", "Perskaityta", "Perskaityti"];

function LabelBadge({ pubId, currentLabel, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const colors = LABEL_COLORS[currentLabel];

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const handleSelect = async (label) => {
    setSaving(true);
    setOpen(false);
    try {
      await updateLabel(pubId, label === currentLabel ? null : label);
      onChange(label === currentLabel ? null : label);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={saving}
        style={{
          padding: "1px 8px",
          borderRadius: "20px",
          border: `1px solid ${colors?.border ?? "#cccccc"}`,
          background: colors?.bg ?? "#f3f3f3",
          color: colors?.color ?? "#666666",
          fontSize: "11px",
          fontFamily: "Times New Roman",
          cursor: "pointer",
          fontStyle: currentLabel ? "normal" : "italic",
        }}
      >
        {currentLabel ?? "Pridėti žymą"}
      </button>

      {open && (
        <div
        onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 50,
            overflow: "hidden",
            minWidth: "130px",
          }}
        >
          {LABEL_OPTIONS.map((label) => {
            const c = LABEL_COLORS[label];
            const isActive = label === currentLabel;
            return (
              <button
                key={label}
                onClick={() => handleSelect(label)}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  background: isActive ? "#f3f3f3" : "none",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                  }}
                />
                {label}
                {isActive && (
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "#aaaaaa",
                      fontSize: "11px",
                    }}
                  >
                    ✕
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LabelBadge;

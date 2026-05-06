import React, { useState, useEffect } from "react";
import Modal from "./modal";
import { useLanguage } from "./language";
import { useToast } from "./toastContext";

function CreateProjectModal({
  open,
  onClose,
  onCreate,
  initialProject = null,
  mode = "create",
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setName(initialProject?.name ?? "");
      setDescription(initialProject?.description ?? "");
    }
  }, [open, initialProject]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Įveskite projekto pavadinimą.");
      return;
    }
    onCreate({ name: name.trim(), description: description.trim() });
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "7px",
    border: "1px solid #c8d4e3",
    boxSizing: "border-box",
    fontFamily: "Times New Roman",
    fontSize: "14px",
    color: "#1e2d4a",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "5px",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7a90aa",
    fontFamily: "Times New Roman",
  };

  return (
    <Modal
      open={open}
      title={mode === "edit" ? "Redaguoti projektą" : t.create_project}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <div>
          <label style={labelStyle}>{t.project_name_label}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
          />
        </div>
        <div>
          <label style={labelStyle}>{t.project_desc_label}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "4px",
          }}
        >
          <button
            type="button"
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
            {t.cancel}
          </button>
          <button
            type="submit"
            style={{
              padding: "7px 16px",
              background: "#1e2d4a",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "Times New Roman",
              fontSize: "13px",
              color: "#ffffff",
              fontWeight: "600",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2a3f63")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1e2d4a")}
          >
            {mode === "edit" ? "Išsaugoti" : t.create}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateProjectModal;

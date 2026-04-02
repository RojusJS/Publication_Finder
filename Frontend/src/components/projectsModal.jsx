import React, { useState, useEffect } from "react";
import Modal from "./modal";
import { useLanguage } from "./language";
import { useToast } from "./toastContext";

function CreateProjectModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { t } = useLanguage();
  const {showToast} = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast("Įveskite projekto pavadinimą.");
      return;
    }

    onCreate({
      name: name.trim(),
      description: description.trim(),
    });
  };

  return (
    <Modal open={open} title={t.create_project} onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <div>
          <label style={{ display: "block", marginBottom: "6px" }}>
            {t.project_name_label}
          </label>
          <input
            type="text"
            placeholder={t.project_name_placeholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              border: "1.2px solid #000000",
              boxSizing: "border-box",
              fontFamily: "Times New Roman",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "6px" }}>
            {t.project_desc_label}
          </label>
          <textarea
            placeholder={t.project_desc_placeholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              border: "1.2px solid #000000",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "Times New Roman",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "8px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #000000",
              background: "#ffffff",
              cursor: "pointer",
              fontFamily: "Times New Roman",
            }}
          >
            {t.cancel}
          </button>

          <button
            type="submit"
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #000000",
              background: "#000000",
              cursor: "pointer",
              fontFamily: "Times New Roman",
              color: "#fff"
            }}
          >
            {t.create}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateProjectModal;
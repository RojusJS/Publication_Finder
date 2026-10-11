import { useState } from "react";
import { errorMessage, fieldErrors } from "../../api/client";
import { useT } from "../../i18n/LanguageContext";
import { Alert } from "../ui/Feedback";
import Modal from "../ui/Modal";

function ProjectForm({ initial, onSubmit, onCancel, submitLabel }) {
  const t = useT();
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("projects.error_name"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() });
    } catch (err) {
      const fields = fieldErrors(err);
      setError(fields.name || fields.description || errorMessage(err, t, "projects.save_failed"));
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label className="field-label" htmlFor="project-name">{t("projects.name")}</label>
        <input id="project-name" className="input" autoFocus maxLength={255} value={name} placeholder={t("projects.name_placeholder")} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="project-description">{t("projects.description")}</label>
        <textarea id="project-description" className="textarea" rows={4} maxLength={2000} value={description} placeholder={t("projects.description_placeholder")} onChange={(event) => setDescription(event.target.value)} />
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{submitLabel}</button>
      </div>
    </form>
  );
}

/** Create (no ``project``) or edit (with ``project``) a project. ``onSubmit`` must return a promise. */
export default function ProjectFormModal({ open, onClose, project, onSubmit }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} size="md" title={t(project ? "projects.edit_title" : "projects.create_title")}>
      <ProjectForm
        initial={project}
        onSubmit={onSubmit}
        onCancel={onClose}
        submitLabel={t(project ? "common.save" : "projects.create")}
      />
    </Modal>
  );
}

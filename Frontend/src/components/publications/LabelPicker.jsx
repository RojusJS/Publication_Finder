import { useState } from "react";
import { errorMessage } from "../../api/client";
import { updatePublication } from "../../api/projects";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../i18n/LanguageContext";
import { LABELS } from "../../utils/publication";
import Dropdown from "../ui/Dropdown";
import Icon from "../ui/Icon";

/** Reading-status label of a saved publication (read-only for viewers). */
export default function LabelPicker({ projectId, publication, canEdit, onChange }) {
  const t = useT();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const current = publication.label;
  const text = current ? t(`labels.${current}`) : t("labels.none");
  const className = `label-badge ${current ? `label-${current}` : "is-empty"}`;

  if (!canEdit) {
    return current ? <span className={className}>{text}</span> : null;
  }

  const choose = async (label, close) => {
    close();
    const next = label === current ? null : label;
    setSaving(true);
    try {
      const updated = await updatePublication(projectId, publication.id, { label: next });
      onChange?.(updated);
    } catch (error) {
      showToast(errorMessage(error, t, "labels.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dropdown
      label={text}
      buttonClassName={className}
      disabled={saving}
      buttonProps={{ "aria-label": t("labels.change", { label: text }) }}
    >
      {({ close }) => (
        <>
          {LABELS.map((label) => (
            <button
              key={label}
              type="button"
              className={`menu-item ${label === current ? "is-active" : ""}`}
              onClick={() => choose(label, close)}
            >
              <span className={`label-dot label-${label}`} />
              {t(`labels.${label}`)}
              {label === current && (
                <span className="menu-item-hint">
                  <Icon name="x" size={12} /> {t("labels.remove")}
                </span>
              )}
            </button>
          ))}
        </>
      )}
    </Dropdown>
  );
}

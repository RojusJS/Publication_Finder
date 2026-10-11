import { useState } from "react";
import { errorMessage } from "../../api/client";
import { getCitation } from "../../api/search";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useT } from "../../i18n/LanguageContext";
import { copyToClipboard, downloadText } from "../../utils/download";
import { shortId } from "../../utils/publication";
import { Alert, Loading } from "../ui/Feedback";
import Icon from "../ui/Icon";
import Modal from "../ui/Modal";

const STYLES = [
  { id: "apa", label: "APA" },
  { id: "mla", label: "MLA" },
  { id: "chicago", label: "Chicago" },
  { id: "harvard", label: "Harvard" },
  { id: "ieee", label: "IEEE" },
  { id: "bibtex", label: "BibTeX" },
  { id: "ris", label: "RIS" },
];
const FILE_TYPES = { bibtex: ["bib", "application/x-bibtex"], ris: ["ris", "application/x-research-info-systems"] };

function CiteBody({ publication }) {
  const t = useT();
  const showToast = useToast();
  const [style, setStyle] = useState("apa");
  const id = shortId(publication.openalex_id);
  const citation = useQuery(`cite:${id}:${style}`, () => getCitation(id, style));
  const text = citation.data?.text || "";
  const isCode = style === "bibtex" || style === "ris";

  const copy = async () => {
    try {
      await copyToClipboard(text);
      showToast(t("cite.copied"), "success");
    } catch {
      showToast(t("cite.copy_failed"));
    }
  };

  return (
    <div className="stack">
      <div className="segmented" role="group" aria-label={t("cite.style")}>
        {STYLES.map((item) => (
          <button key={item.id} type="button" aria-pressed={style === item.id} onClick={() => setStyle(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {citation.loading && <Loading label={t("common.loading")} />}
      {citation.error && <Alert>{errorMessage(citation.error, t, "cite.failed")}</Alert>}
      {citation.data && (
        <>
          <div className={`citation-box ${isCode ? "is-code" : ""}`}>{text}</div>
          <p className="tiny muted">
            {citation.data.source === "doi" ? t("cite.source_doi") : citation.data.source === "local" ? t("cite.source_local") : t("cite.source_generated")}
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
              <Icon name="copy" /> {t("cite.copy")}
            </button>
            {isCode && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => downloadText(text, `${id}.${FILE_TYPES[style][0]}`, FILE_TYPES[style][1])}
              >
                <Icon name="download" /> {t("cite.download")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CiteModal({ open, onClose, publication }) {
  const t = useT();
  if (!publication) return null;
  return (
    <Modal open={open} onClose={onClose} title={t("cite.title")} size="md">
      <CiteBody publication={publication} />
    </Modal>
  );
}

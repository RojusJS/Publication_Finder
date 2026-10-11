import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { authorsLine } from "../../utils/publication";
import Icon from "../ui/Icon";
import PublicationModal from "./PublicationModal";
import SaveToProjectMenu from "./SaveToProjectMenu";

export default function PublicationCard({ publication, selected = false, onToggleSelect, extra }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [savedIn, setSavedIn] = useState(publication.saved_in || []);
  const pub = { ...publication, saved_in: savedIn };

  const markSaved = (result, project) => {
    if (result.saved.length && !savedIn.some((entry) => entry.project_id === project.id)) {
      setSavedIn([...savedIn, { project_id: project.id, project_name: project.name }]);
    }
  };

  const meta = [pub.source_name, pub.year, pub.type && (t.has(`types.${pub.type}`) ? t(`types.${pub.type}`) : pub.type)]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className={`pub-card ${selected ? "is-selected" : ""}`}>
      {onToggleSelect && (
        <label className="pub-card-select">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(pub)}
            aria-label={t("search.select_publication", { title: pub.title })}
          />
        </label>
      )}
      <div className="pub-card-body">
        <button type="button" className="pub-title" onClick={() => setOpen(true)}>
          {pub.title || t("publication.untitled")}
        </button>
        {pub.authors?.length > 0 && <p className="pub-authors">{authorsLine(pub.authors, 4, t("common.et_al"))}</p>}
        {meta && <p className="pub-meta">{meta}</p>}
        {pub.abstract && <p className="pub-abstract">{pub.abstract}</p>}
        <div className="pub-footer">
          <span className="chip">{t.count("publication.citations", pub.cited_by_count || 0)}</span>
          {pub.is_oa && <span className="chip chip-success">{t("publication.open_access")}</span>}
          {pub.is_retracted && (
            <span className="chip chip-danger">
              <Icon name="alert" size={12} /> {t("publication.retracted")}
            </span>
          )}
          {savedIn.length > 0 && (
            <span className="chip chip-info" title={savedIn.map((entry) => entry.project_name).join(", ")}>
              <Icon name="bookmark" size={12} /> {t("publication.saved_in_short", { project: savedIn[0].project_name })}
              {savedIn.length > 1 && ` +${savedIn.length - 1}`}
            </span>
          )}
          {extra}
          <span className="spacer" />
          {pub.pdf_url && (
            <a className="btn btn-ghost btn-xs" href={pub.pdf_url} target="_blank" rel="noopener noreferrer">
              <Icon name="file" size={13} /> PDF
            </a>
          )}
          <SaveToProjectMenu openalexIds={[pub.openalex_id]} buttonClassName="btn btn-secondary btn-xs" align="end" onSaved={markSaved} />
        </div>
      </div>
      <PublicationModal open={open} onClose={() => setOpen(false)} publication={pub} />
    </article>
  );
}

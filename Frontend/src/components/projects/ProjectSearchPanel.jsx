import { useState } from "react";
import { errorMessage } from "../../api/client";
import { semanticSearch } from "../../api/projects";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { authorsLine } from "../../utils/publication";
import PublicationModal from "../publications/PublicationModal";
import { Alert, EmptyState, Loading } from "../ui/Feedback";
import Icon from "../ui/Icon";

export default function ProjectSearchPanel({ project, folderId }) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [openPublication, setOpenPublication] = useState(null);
  const results = useQuery(submitted ? `semantic:${project.id}:${folderId || "all"}:${submitted}` : null, () =>
    semanticSearch(project.id, submitted, folderId),
  );

  return (
    <div className="stack">
      <p className="small muted">{t("project_search.description")}</p>
      <form
        className="row"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(text.trim());
        }}
      >
        <input
          className="input"
          type="search"
          value={text}
          maxLength={300}
          placeholder={t("project_search.placeholder")}
          aria-label={t("project_search.placeholder")}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={!text.trim() || results.loading}>
          <Icon name="search" /> {t("search.button")}
        </button>
      </form>

      {results.loading && <Loading label={t("search.searching")} />}
      {results.error && <Alert>{errorMessage(results.error, t)}</Alert>}
      {results.data && results.data.results.length === 0 && (
        <EmptyState title={t("project_search.no_results_title")}>{t("project_search.no_results")}</EmptyState>
      )}
      {results.data?.results.length > 0 && (
        <div className="stack-sm">
          <p className="tiny muted">
            {results.data.method === "embeddings" ? t("project_search.method_semantic") : t("project_search.method_keywords")}
          </p>
          {results.data.results.map((publication) => (
            <div key={publication.id} className="list-row">
              <div className="list-row-main">
                <button type="button" className="list-row-title" onClick={() => setOpenPublication(publication)}>
                  {publication.title}
                </button>
                <span className="small muted">
                  {[authorsLine(publication.authors, 3, t("common.et_al")), publication.year].filter(Boolean).join(" · ")}
                </span>
              </div>
              <span className={`score-badge ${publication.similarity >= 55 ? "score-high" : publication.similarity >= 35 ? "score-mid" : ""}`}>
                {t("project_search.match", { score: publication.similarity })}
              </span>
            </div>
          ))}
        </div>
      )}

      {openPublication && (
        <PublicationModal
          open
          onClose={() => setOpenPublication(null)}
          saved={{ projectId: project.id, role: project.role, publication: openPublication }}
        />
      )}
    </div>
  );
}

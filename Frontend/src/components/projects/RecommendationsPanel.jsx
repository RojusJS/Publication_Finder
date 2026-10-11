import { useState } from "react";
import { errorMessage } from "../../api/client";
import { getRecommendations, listFeedback, sendFeedback } from "../../api/projects";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { authorsLine } from "../../utils/publication";
import PublicationModal from "../publications/PublicationModal";
import SaveToProjectMenu from "../publications/SaveToProjectMenu";
import { Alert, EmptyState, Loading } from "../ui/Feedback";
import Icon from "../ui/Icon";

function reasonText(reason, t) {
  switch (reason.code) {
    case "cites_saved":
      return t.count("recommendations.reason_cites_saved", reason.count);
    case "cited_by_saved":
      return t.count("recommendations.reason_cited_by_saved", reason.count);
    case "related_to_saved":
      return t.count("recommendations.reason_related", reason.count);
    case "similar_to":
      return t("recommendations.reason_similar", { title: reason.title, similarity: reason.similarity });
    case "topic_match":
      return t("recommendations.reason_topic", { keywords: (reason.keywords || []).join(", ") });
    default:
      return null;
  }
}

function RecommendationCard({ item, feedback, selected, onToggleSelect, onFeedback, onSaved }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const scoreClass = item.score >= 60 ? "score-high" : item.score >= 40 ? "score-mid" : "";
  const dimmed = feedback === "negative";
  return (
    <article className={`pub-card ${selected ? "is-selected" : ""}`} style={{ opacity: dimmed ? 0.6 : 1 }}>
      <label className="pub-card-select">
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(item)} aria-label={t("search.select_publication", { title: item.title })} />
      </label>
      <div className="pub-card-body">
        <button type="button" className="pub-title" style={{ fontSize: 15.5 }} onClick={() => setOpen(true)}>
          {item.title}
        </button>
        <p className="pub-meta">
          {[authorsLine(item.authors, 3, t("common.et_al")), item.year, item.source_name].filter(Boolean).join(" · ")}
        </p>
        <ul className="reason-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {item.reasons.map((reason) => {
            const text = reasonText(reason, t);
            return text ? (
              <li key={reason.code} className="row" style={{ gap: 6, alignItems: "flex-start" }}>
                <Icon name="lightbulb" size={13} /> <span>{text}</span>
              </li>
            ) : null;
          })}
        </ul>
        <div className="pub-footer">
          <span className={`score-badge ${scoreClass}`} title={t("recommendations.score_help")}>
            {t("recommendations.match", { score: item.score })}
          </span>
          {item.is_oa && <span className="chip chip-success">{t("publication.open_access")}</span>}
          {item.saved_in?.length > 0 && <span className="chip chip-info">{t("publication.saved_in_short", { project: item.saved_in[0].project_name })}</span>}
          <span className="spacer" />
          <button type="button" className="btn btn-success-ghost btn-xs" aria-pressed={feedback === "positive"} onClick={() => onFeedback(item, "positive")}>
            <Icon name="thumbsUp" size={13} /> {t("recommendations.relevant")}
          </button>
          <button type="button" className="btn btn-danger-ghost btn-xs" aria-pressed={feedback === "negative"} onClick={() => onFeedback(item, "negative")}>
            <Icon name="thumbsDown" size={13} /> {t("recommendations.not_relevant")}
          </button>
          <SaveToProjectMenu openalexIds={[item.openalex_id]} buttonClassName="btn btn-secondary btn-xs" align="end" onSaved={onSaved} />
        </div>
      </div>
      <PublicationModal open={open} onClose={() => setOpen(false)} publication={item} />
    </article>
  );
}

export default function RecommendationsPanel({ project, folderId, onLibraryChanged }) {
  const { t, formatDate } = useLanguage();
  const showToast = useToast();
  const [run, setRun] = useState(0);
  const [selected, setSelected] = useState({});
  const recommendations = useQuery(run ? `recommendations:${project.id}:${folderId || "all"}:${run}` : null, () =>
    getRecommendations(project.id, folderId, 12),
  );
  const feedback = useQuery(`feedback:${project.id}`, () => listFeedback(project.id));
  const feedbackMap = Object.fromEntries((feedback.data || []).map((item) => [item.openalex_id, item.feedback]));
  const data = recommendations.data || (recommendations.loading ? recommendations.previousData : undefined);
  const selectedIds = Object.keys(selected);

  const toggleFeedback = async (item, value) => {
    const next = feedbackMap[item.openalex_id] === value ? null : value;
    try {
      await sendFeedback(project.id, item.openalex_id, item.title, next);
      feedback.setData((current = []) => {
        const rest = current.filter((entry) => entry.openalex_id !== item.openalex_id);
        return next ? [...rest, { openalex_id: item.openalex_id, feedback: next }] : rest;
      });
      if (next) showToast(t(next === "positive" ? "recommendations.feedback_positive" : "recommendations.feedback_negative"), "info");
    } catch (error) {
      showToast(errorMessage(error, t));
    }
  };

  const toggleSelect = (item) => {
    const next = { ...selected };
    if (next[item.openalex_id]) delete next[item.openalex_id];
    else next[item.openalex_id] = true;
    setSelected(next);
  };

  const onSaved = (result, target) => {
    if (target.id === project.id) onLibraryChanged?.();
  };

  return (
    <div className="stack">
      <div className="row-between" style={{ flexWrap: "wrap" }}>
        <p className="small muted" style={{ maxWidth: 460 }}>{t("recommendations.description")}</p>
        <button type="button" className="btn btn-primary btn-sm" disabled={recommendations.loading} onClick={() => { setSelected({}); setRun(run + 1); }}>
          <Icon name="sparkles" /> {run ? t("recommendations.refresh") : t("recommendations.get")}
        </button>
      </div>

      {recommendations.error && <Alert>{errorMessage(recommendations.error, t, "recommendations.failed")}</Alert>}
      {!data && recommendations.loading && <Loading label={t("recommendations.loading")} />}
      {!run && <EmptyState icon="sparkles" title={t("recommendations.intro_title")}>{t("recommendations.intro")}</EmptyState>}

      {data && (
        <div style={{ opacity: recommendations.loading ? 0.55 : 1, transition: "opacity .15s" }}>
          {data.seed_count === 0 && <EmptyState icon="book" title={t("recommendations.no_seeds_title")}>{t("recommendations.no_seeds")}</EmptyState>}
          {data.seed_count > 0 && data.recommendations.length === 0 && (
            <EmptyState title={t("recommendations.none_title")}>{t("recommendations.none")}</EmptyState>
          )}
          {data.recommendations.length > 0 && (
            <p className="tiny muted" style={{ marginBottom: 8 }}>
              {t.count("recommendations.based_on", data.seed_count)} ·{" "}
              {data.method === "embeddings" ? t("recommendations.method_semantic") : t("recommendations.method_keywords")} ·{" "}
              {formatDate(data.generated_at, { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {data.recommendations.map((item) => (
            <RecommendationCard
              key={item.openalex_id}
              item={item}
              feedback={feedbackMap[item.openalex_id]}
              selected={Boolean(selected[item.openalex_id])}
              onToggleSelect={toggleSelect}
              onFeedback={toggleFeedback}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="selection-bar">
          <strong>{t.count("search.selected", selectedIds.length)}</strong>
          <span className="spacer" />
          <SaveToProjectMenu
            openalexIds={selectedIds}
            buttonClassName="btn btn-light btn-sm"
            align="end"
            onSaved={(result, target) => {
              if (result.saved.length) setSelected({});
              onSaved(result, target);
            }}
          />
          <button type="button" className="btn btn-on-dark btn-sm" onClick={() => setSelected({})}>
            {t("search.clear_selection")}
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { errorMessage } from "../../api/client";
import { generateInsight, getInsight } from "../../api/projects";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { copyToClipboard, downloadText } from "../../utils/download";
import { Alert, EmptyState, Loading } from "../ui/Feedback";
import Icon from "../ui/Icon";

const FOCUSES = ["overview", "themes", "methodology", "gaps"];

function toMarkdown(projectName, focusLabel, insight) {
  const lines = [`# ${projectName} — ${focusLabel}`, ""];
  insight.sections.forEach((section) => {
    if (section.title) lines.push(`## ${section.title}`, "");
    lines.push(section.body, "");
  });
  return lines.join("\n");
}

export default function InsightsPanel({ project, folderId }) {
  const { t, lang, formatDate } = useLanguage();
  const showToast = useToast();
  const [focus, setFocus] = useState("overview");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const key = `insight:${project.id}:${folderId || "all"}:${focus}:${lang}`;
  const latest = useQuery(key, () => getInsight(project.id, { focus, language: lang, folder: folderId || undefined }));
  const insight = latest.data?.insight;

  const generate = async (force) => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await generateInsight(project.id, { focus, language: lang, folder_id: folderId || null, force });
      latest.setData(result);
      if (result.cached) showToast(t("insights.reused"), "info");
    } catch (error) {
      setGenerateError(errorMessage(error, t, "insights.failed"));
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    try {
      await copyToClipboard(insight.sections.map((section) => `${section.title ? `${section.title}\n` : ""}${section.body}`).join("\n\n"));
      showToast(t("cite.copied"), "success");
    } catch {
      showToast(t("cite.copy_failed"));
    }
  };

  return (
    <div className="stack">
      <p className="small muted">{t("insights.description")}</p>
      <div className="row-wrap">
        <label className="visually-hidden" htmlFor="insight-focus">{t("insights.focus")}</label>
        <select id="insight-focus" className="select select-sm" style={{ width: "auto" }} value={focus} disabled={generating} onChange={(event) => setFocus(event.target.value)}>
          {FOCUSES.map((value) => (
            <option key={value} value={value}>{t(`insights.focus_${value}`)}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary btn-sm" disabled={generating || latest.loading} onClick={() => generate(Boolean(insight))}>
          <Icon name="sparkles" /> {generating ? t("insights.generating") : insight ? t("insights.regenerate") : t("insights.generate")}
        </button>
        {insight && (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
              <Icon name="copy" /> {t("cite.copy")}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => downloadText(toMarkdown(project.name, t(`insights.focus_${focus}`), insight), `${project.name}-${focus}.md`, "text/markdown;charset=utf-8")}
            >
              <Icon name="download" /> {t("insights.download")}
            </button>
          </>
        )}
      </div>

      {generateError && <Alert>{generateError}</Alert>}
      {latest.error && <Alert>{errorMessage(latest.error, t)}</Alert>}
      {latest.loading && <Loading label={t("common.loading")} />}
      {generating && <Loading label={t("insights.generating_long")} />}

      {!latest.loading && !insight && !generating && (
        <EmptyState icon="sparkles" title={t("insights.empty_title")}>{t("insights.empty")}</EmptyState>
      )}

      {insight && !generating && (
        <article className="card card-pad">
          {latest.data.stale && (
            <div style={{ marginBottom: 14 }}>
              <Alert kind="warning">{t("insights.stale")}</Alert>
            </div>
          )}
          {insight.sections.map((section, index) => (
            <section key={index} className="insight-section">
              {section.title && <h4>{section.title}</h4>}
              <div className="insight-body">
                {section.body.split(/\n{2,}/).map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="pre-wrap">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
          <p className="tiny muted" style={{ marginTop: 16 }}>
            {t("insights.meta", {
              count: insight.publication_count,
              date: formatDate(insight.created_at),
              user: insight.created_by || "—",
              model: insight.model,
            })}
          </p>
          <p className="tiny subtle">{t("insights.disclaimer")}</p>
        </article>
      )}
    </div>
  );
}

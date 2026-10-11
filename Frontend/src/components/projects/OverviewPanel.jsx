import { useState } from "react";
import { errorMessage } from "../../api/client";
import { getAnalytics, getSavedPublication } from "../../api/projects";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { LABELS } from "../../utils/publication";
import ColumnChart from "../charts/ColumnChart";
import PublicationModal from "../publications/PublicationModal";
import { Alert, EmptyState, Loading } from "../ui/Feedback";

function LabelBars({ labels, unlabeled, total }) {
  const { t, formatNumber } = useLanguage();
  const rows = [...LABELS.map((code) => ({ key: code, label: t(`labels.${code}`), value: labels[code] || 0 })), { key: "none", label: t("library.no_label"), value: unlabeled }];
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="stack-sm" role="list">
      {rows.map((row) => (
        <div key={row.key} className="hbar-row" role="listitem" title={`${row.label}: ${row.value}`}>
          <span className="truncate">{row.label}</span>
          <span className="hbar-track" aria-hidden="true">
            {row.value > 0 && <span className="hbar-fill" style={{ display: "block", width: `${(row.value / max) * 100}%` }} />}
          </span>
          <span className="hbar-value">
            {formatNumber(row.value)}
            <span className="visually-hidden"> / {total}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function RankedList({ title, items }) {
  const { formatNumber } = useLanguage();
  if (!items.length) return null;
  return (
    <section className="stack-sm">
      <h3 className="section-title">{title}</h3>
      <ol className="ranked-list">
        {items.map((item) => (
          <li key={item.name}>
            <span className="truncate">{item.name}</span>
            <span className="count">{formatNumber(item.count)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function OverviewPanel({ project, folderId, version }) {
  const { t, formatNumber } = useLanguage();
  const showToast = useToast();
  const analytics = useQuery(`analytics:${project.id}:${folderId || "all"}:${version}`, () => getAnalytics(project.id, folderId));
  const [openPublication, setOpenPublication] = useState(null);
  const data = analytics.data || analytics.previousData;

  const openSaved = async (id) => {
    try {
      setOpenPublication(await getSavedPublication(project.id, id));
    } catch (error) {
      showToast(errorMessage(error, t));
    }
  };

  if (analytics.error) return <Alert>{errorMessage(analytics.error, t)}</Alert>;
  if (!data) return <Loading label={t("common.loading")} />;
  if (data.total_publications === 0) {
    return <EmptyState icon="chart" title={t("overview.empty_title")}>{t("overview.empty")}</EmptyState>;
  }

  const oaShare = Math.round((data.open_access_count / data.total_publications) * 100);
  const tiles = [
    { label: t("overview.publications"), value: formatNumber(data.total_publications) },
    { label: t("overview.citations"), value: formatNumber(data.total_citations) },
    { label: t("overview.years"), value: data.year_min ? (data.year_min === data.year_max ? data.year_min : `${data.year_min}–${data.year_max}`) : "—" },
    { label: t("overview.open_access"), value: `${oaShare}%` },
    { label: t("overview.notes"), value: formatNumber(data.notes_count) },
    { label: t("overview.folders"), value: formatNumber(data.folder_count) },
  ];

  return (
    <div className="stack-lg" style={{ opacity: analytics.loading ? 0.55 : 1, transition: "opacity .15s" }}>
      <div className="stat-grid">
        {tiles.map((tile) => (
          <div key={tile.label} className="stat-tile">
            <div className="stat-label">{tile.label}</div>
            <div className="stat-value">{tile.value}</div>
          </div>
        ))}
      </div>

      {data.retracted.length > 0 && (
        <Alert>
          <strong>{t.count("overview.retracted", data.retracted.length)}</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {data.retracted.map((item) => (
              <li key={item.id}>
                <button type="button" className="link-button" style={{ color: "inherit", textAlign: "left" }} onClick={() => openSaved(item.id)}>
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {data.year_distribution.length > 1 && (
        <section className="card card-pad stack-sm">
          <h3 className="section-title">{t("overview.per_year")}</h3>
          <ColumnChart
            data={data.year_distribution.map((item) => ({ label: String(item.year), value: item.count }))}
            valueLabel={t("overview.publications_unit")}
            ariaLabel={t("overview.per_year")}
          />
        </section>
      )}

      <section className="card card-pad stack-sm">
        <h3 className="section-title">{t("overview.reading_progress")}</h3>
        <LabelBars labels={data.labels} unlabeled={data.unlabeled_count} total={data.total_publications} />
      </section>

      {data.top_keywords.length > 0 && (
        <section className="stack-sm">
          <h3 className="section-title">{t("overview.keywords")}</h3>
          <div className="row-wrap">
            {data.top_keywords.map((keyword) => (
              <span key={keyword.name} className="chip chip-outline">
                {keyword.name} <span className="muted">{keyword.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        <RankedList title={t("overview.authors")} items={data.top_authors} />
        <RankedList title={t("overview.sources")} items={data.top_sources} />
      </div>

      <section className="stack-sm">
        <h3 className="section-title">{t("overview.most_cited")}</h3>
        <ol className="ranked-list">
          {data.most_cited.map((item) => (
            <li key={item.id}>
              <button type="button" className="link-button truncate" style={{ textAlign: "left" }} onClick={() => openSaved(item.id)}>
                {item.title}
              </button>
              <span className="count">{formatNumber(item.cited_by_count)}</span>
            </li>
          ))}
        </ol>
      </section>

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

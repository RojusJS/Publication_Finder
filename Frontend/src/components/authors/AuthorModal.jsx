import { useState } from "react";
import { errorMessage } from "../../api/client";
import { getAuthor, getAuthorWorks } from "../../api/search";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { shortId } from "../../utils/publication";
import ColumnChart from "../charts/ColumnChart";
import { Alert, Loading } from "../ui/Feedback";
import Modal from "../ui/Modal";
import Pagination from "../ui/Pagination";
import PublicationCard from "../publications/PublicationCard";

function AuthorWorks({ authorId }) {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("cited_by_count_desc");
  const works = useQuery(`author-works:${authorId}:${page}:${sort}`, () => getAuthorWorks(authorId, page, sort));
  const data = works.data || works.previousData;

  return (
    <section className="stack">
      <div className="row-between">
        <h3 className="section-title">
          {t("authors.works")} {data ? `(${data.total_count})` : ""}
        </h3>
        <div className="segmented" role="group" aria-label={t("search.sort")}>
          <button type="button" aria-pressed={sort === "cited_by_count_desc"} onClick={() => { setSort("cited_by_count_desc"); setPage(1); }}>
            {t("authors.most_cited")}
          </button>
          <button type="button" aria-pressed={sort === "year_desc"} onClick={() => { setSort("year_desc"); setPage(1); }}>
            {t("authors.newest")}
          </button>
        </div>
      </div>
      {works.error && <Alert>{errorMessage(works.error, t)}</Alert>}
      {!data && works.loading && <Loading label={t("common.loading")} />}
      {data && (
        <div style={{ opacity: works.loading ? 0.55 : 1, transition: "opacity .15s" }}>
          {data.results.length === 0 && <p className="muted small">{t("authors.no_works")}</p>}
          {data.results.map((pub) => (
            <PublicationCard key={pub.openalex_id} publication={pub} />
          ))}
          <Pagination page={page} totalPages={data.total_pages} onChange={setPage} disabled={works.loading} />
        </div>
      )}
    </section>
  );
}

function AuthorProfile({ authorId }) {
  const { t, formatNumber } = useLanguage();
  const author = useQuery(`author:${authorId}`, () => getAuthor(authorId));

  if (author.loading) return <Loading label={t("common.loading")} />;
  if (author.error) return <Alert>{errorMessage(author.error, t, "authors.load_failed")}</Alert>;
  const data = author.data;
  if (!data) return null;

  const stats = [
    { label: t("authors.works_count"), value: data.works_count },
    { label: t("authors.citations"), value: data.cited_by_count },
    { label: t("authors.h_index"), value: data.h_index },
    { label: t("authors.i10_index"), value: data.i10_index },
  ];

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        {data.institutions.length > 0 && <p className="small">{data.institutions.join(" · ")}</p>}
        {data.orcid && (
          <p className="small">
            ORCID:{" "}
            <a href={data.orcid} target="_blank" rel="noopener noreferrer">
              {data.orcid.replace("https://orcid.org/", "")}
            </a>
          </p>
        )}
      </div>
      <div className="stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-tile">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value == null ? "—" : formatNumber(stat.value)}</div>
          </div>
        ))}
      </div>
      {data.topics.length > 0 && (
        <section className="stack-sm">
          <h3 className="section-title">{t("authors.topics")}</h3>
          <div className="row-wrap">
            {data.topics.map((topic) => (
              <span key={topic.name} className="chip chip-outline">
                {topic.name} <span className="muted">· {t.count("authors.topic_works", topic.count)}</span>
              </span>
            ))}
          </div>
        </section>
      )}
      {data.counts_by_year.length > 1 && (
        <section className="stack-sm">
          <h3 className="section-title">{t("authors.citations_per_year")}</h3>
          <ColumnChart
            data={data.counts_by_year.map((item) => ({ label: String(item.year), value: item.cited_by_count }))}
            valueLabel={t("authors.citations_unit")}
            ariaLabel={t("authors.citations_per_year")}
          />
        </section>
      )}
      <AuthorWorks authorId={authorId} />
    </div>
  );
}

export default function AuthorModal({ open, onClose, author }) {
  if (!author) return null;
  return (
    <Modal open={open} onClose={onClose} size="lg" title={author.display_name} titleClassName="serif">
      <AuthorProfile authorId={shortId(author.id)} />
    </Modal>
  );
}

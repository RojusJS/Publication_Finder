import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { errorMessage } from "../api/client";
import { searchAuthors, searchPublications } from "../api/search";
import AuthorCard from "../components/authors/AuthorCard";
import PublicationCard from "../components/publications/PublicationCard";
import SaveToProjectMenu from "../components/publications/SaveToProjectMenu";
import FiltersPanel from "../components/search/FiltersPanel";
import SearchBox from "../components/search/SearchBox";
import {
  PER_PAGE,
  SORTS,
  activeFilterCount,
  hasSearch,
  readSearchState,
  stateFromHistory,
  toApiParams,
  writeSearchState,
} from "../components/search/searchParams";
import { Alert, EmptyState, Loading } from "../components/ui/Feedback";
import Icon from "../components/ui/Icon";
import Pagination from "../components/ui/Pagination";
import useQuery from "../hooks/useQuery";
import { useLanguage } from "../i18n/LanguageContext";

const EXAMPLES = ["machine learning in healthcare", "CRISPR gene editing", "10.1038/nature14539"];

function Welcome({ onExample }) {
  const { t } = useLanguage();
  return (
    <div className="stack" style={{ alignItems: "center", textAlign: "center", padding: "12px 0 24px" }}>
      <p className="muted small">{t("search.try")}</p>
      <div className="row-wrap" style={{ justifyContent: "center" }}>
        {EXAMPLES.map((example) => (
          <button key={example} type="button" className="chip chip-outline" onClick={() => onExample(example)}>
            {example}
          </button>
        ))}
      </div>
      <div className="row-wrap" style={{ justifyContent: "center", gap: 20, marginTop: 12 }}>
        {["tip_doi", "tip_save", "tip_recommend"].map((tip) => (
          <div key={tip} className="card card-pad small" style={{ maxWidth: 260, textAlign: "left" }}>
            <strong>{t(`search.${tip}_title`)}</strong>
            <p className="muted" style={{ marginTop: 4 }}>{t(`search.${tip}`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const state = readSearchState(params);
  const searching = hasSearch(state);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [selection, setSelection] = useState({ key: "", items: {} });

  const queryKey = searching ? `search:${writeSearchState(state).toString()}` : null;
  const results = useQuery(queryKey, () =>
    state.by === "author" ? searchAuthors(state.q.trim(), state.page) : searchPublications(toApiParams(state)),
  );
  const data = results.data || (results.loading ? results.previousData : undefined);
  const isAuthorResult = data && data.results.length > 0 && "works_count" in data.results[0];
  const showAuthors = state.by === "author";

  const selectionKey = `${state.q}|${state.by}|${state.author}`;
  const selected = selection.key === selectionKey ? selection.items : {};
  const selectedIds = Object.keys(selected);

  const navigate = (next, { resetPage = true } = {}) => {
    const merged = { ...state, ...next };
    if (resetPage) merged.page = 1;
    setParams(writeSearchState(merged));
  };

  const toggleSelected = (pub) => {
    const items = { ...selected };
    if (items[pub.openalex_id]) delete items[pub.openalex_id];
    else items[pub.openalex_id] = true;
    setSelection({ key: selectionKey, items });
  };

  const changePage = (page) => {
    navigate({ page }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filterCount = activeFilterCount(state);

  return (
    <div className="page">
      <section className="search-hero">
        <h1 className="search-hero-title">{t("search.title")}</h1>
        <p className="search-hero-sub">{t("search.subtitle")}</p>
        <SearchBox
          key={`${state.q}|${state.by}|${state.author}`}
          initial={state}
          busy={results.loading}
          onSearch={(next) => navigate(next)}
          onPickHistory={(entry) => setParams(writeSearchState(stateFromHistory(entry)))}
        />
      </section>

      {!searching && <Welcome onExample={(example) => navigate({ q: example, by: "all" })} />}

      {searching && (
        <div className="search-layout">
          <div style={{ minWidth: 0 }}>
            <div className="results-header">
              <div className="row-wrap">
                {data && !isAuthorResult && !showAuthors && (
                  <strong>{data.doi_match ? t("search.doi_match") : t.count("search.results", data.total_count)}</strong>
                )}
                {data && showAuthors && <strong>{t.count("search.authors_found", data.total_count)}</strong>}
                {results.loading && <span className="spinner" aria-label={t("common.loading")} />}
              </div>
              <div className="row-wrap">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm filters-toggle"
                  aria-expanded={!filtersCollapsed}
                  onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                >
                  <Icon name="filter" /> {t("filters.title")} {filterCount > 0 && <span className="count-badge">{filterCount}</span>}
                </button>
                {!showAuthors && (
                  <>
                    <label className="visually-hidden" htmlFor="sort-select">{t("search.sort")}</label>
                    <select id="sort-select" className="select select-sm" style={{ width: "auto" }} value={state.sort} onChange={(event) => navigate({ sort: event.target.value })}>
                      {SORTS.map((sort) => (
                        <option key={sort} value={sort}>{t(`search.sort_${sort}`)}</option>
                      ))}
                    </select>
                    <label className="visually-hidden" htmlFor="per-page-select">{t("search.per_page")}</label>
                    <select id="per-page-select" className="select select-sm" style={{ width: "auto" }} value={state.per} onChange={(event) => navigate({ per: Number(event.target.value) })}>
                      {PER_PAGE.map((value) => (
                        <option key={value} value={value}>{t("search.per_page_option", { count: value })}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>

            {results.error && (
              <Alert>
                {errorMessage(results.error, t, "search.failed")}{" "}
                <button type="button" className="link-button" onClick={results.reload}>{t("common.retry")}</button>
              </Alert>
            )}
            {!data && results.loading && <Loading label={t("search.searching")} />}

            {data && (
              <div style={{ opacity: results.loading ? 0.55 : 1, transition: "opacity .15s" }}>
                {data.results.length === 0 && !results.loading && (
                  <EmptyState title={t("search.no_results_title")}>{t("search.no_results")}</EmptyState>
                )}
                {showAuthors
                  ? isAuthorResult && data.results.map((author) => <AuthorCard key={author.id} author={author} />)
                  : !isAuthorResult &&
                    data.results.map((pub) => (
                      <PublicationCard
                        key={pub.openalex_id}
                        publication={pub}
                        selected={Boolean(selected[pub.openalex_id])}
                        onToggleSelect={toggleSelected}
                      />
                    ))}
                <Pagination page={state.page} totalPages={data.total_pages} onChange={changePage} disabled={results.loading} />
                {data.total_count > 10000 && <p className="tiny muted" style={{ textAlign: "center" }}>{t("search.result_cap")}</p>}
              </div>
            )}

            {selectedIds.length > 0 && (
              <div className="selection-bar" role="region" aria-label={t("search.selection")}>
                <strong>{t.count("search.selected", selectedIds.length)}</strong>
                <span className="spacer" />
                <SaveToProjectMenu
                  openalexIds={selectedIds}
                  buttonClassName="btn btn-light btn-sm"
                  align="end"
                  onSaved={(result) => {
                    if (result.saved.length) setSelection({ key: selectionKey, items: {} });
                  }}
                />
                <button type="button" className="btn btn-on-dark btn-sm" onClick={() => setSelection({ key: selectionKey, items: {} })}>
                  {t("search.clear_selection")}
                </button>
              </div>
            )}
          </div>

          <FiltersPanel
            state={state}
            collapsed={filtersCollapsed}
            onChange={(patch) => navigate(patch)}
            onReset={() => navigate({ from: "", to: "", type: "", lang: "", oa: false, inst: "", instName: "" })}
          />
        </div>
      )}
      <p className="tiny muted" style={{ textAlign: "center", marginTop: 32 }}>
        {t("search.data_source")}{" "}
        <a href="https://openalex.org" target="_blank" rel="noopener noreferrer">OpenAlex</a>
      </p>
    </div>
  );
}

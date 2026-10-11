/** URL <-> search state. The URL is the single source of truth for a search. */

export const SEARCH_MODES = ["all", "title", "author", "title_and_author"];
export const SORTS = ["relevance", "year_desc", "year_asc", "cited_by_count_desc", "cited_by_count_asc"];
export const PER_PAGE = [10, 25, 50];

const DEFAULTS = {
  q: "",
  by: "all",
  author: "",
  from: "",
  to: "",
  type: "",
  lang: "",
  oa: false,
  inst: "",
  instName: "",
  sort: "relevance",
  page: 1,
  per: 10,
};

function positiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function readSearchState(params) {
  const by = params.get("by");
  const sort = params.get("sort");
  const per = positiveInt(params.get("per"), DEFAULTS.per);
  return {
    q: params.get("q") || "",
    by: SEARCH_MODES.includes(by) ? by : DEFAULTS.by,
    author: params.get("author") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
    type: params.get("type") || "",
    lang: params.get("lang") || "",
    oa: params.get("oa") === "1",
    inst: params.get("inst") || "",
    instName: params.get("instName") || "",
    sort: SORTS.includes(sort) ? sort : DEFAULTS.sort,
    page: positiveInt(params.get("page"), 1),
    per: PER_PAGE.includes(per) ? per : DEFAULTS.per,
  };
}

export function writeSearchState(state) {
  const params = new URLSearchParams();
  Object.entries(state).forEach(([key, value]) => {
    if (value === DEFAULTS[key] || value === "" || value === false || value == null) return;
    params.set(key, value === true ? "1" : String(value));
  });
  return params;
}

export function hasSearch(state) {
  if (state.by === "author") return Boolean(state.q.trim());
  if (state.by === "title_and_author") return Boolean(state.q.trim() || state.author.trim());
  return Boolean(state.q.trim() || state.inst);
}

export function activeFilterCount(state) {
  return ["from", "to", "type", "lang", "inst"].filter((key) => state[key]).length + (state.oa ? 1 : 0);
}

export function toApiParams(state) {
  return {
    q: state.q.trim() || undefined,
    search_by: state.by,
    author: state.by === "title_and_author" ? state.author.trim() || undefined : undefined,
    year_from: state.from || undefined,
    year_to: state.to || undefined,
    type: state.type || undefined,
    language: state.lang || undefined,
    oa: state.oa ? "true" : undefined,
    institution: state.inst || undefined,
    sort: state.sort,
    page: state.page,
    per_page: state.per,
  };
}

/** Converts a stored history entry back into search state. */
export function stateFromHistory(entry) {
  const filters = entry.filters || {};
  return {
    ...DEFAULTS,
    q: entry.query,
    by: SEARCH_MODES.includes(entry.search_by) ? entry.search_by : "all",
    author: filters.author || "",
    from: filters.year_from ? String(filters.year_from) : "",
    to: filters.year_to ? String(filters.year_to) : "",
    type: filters.type || "",
    lang: filters.language || "",
    oa: filters.oa === true,
    inst: filters.institution || "",
    sort: SORTS.includes(filters.sort) ? filters.sort : "relevance",
  };
}

/** Reading-status labels, in workflow order. Colors live in global.css (.label-<code>). */
export const LABELS = ["to_read", "read", "to_cite", "cited"];

export const WORK_TYPES = [
  "article",
  "review",
  "preprint",
  "book",
  "book-chapter",
  "conference-paper",
  "dissertation",
  "dataset",
  "report",
  "editorial",
  "letter",
  "other",
];

export const FILTER_LANGUAGES = ["en", "lt", "de", "fr", "es", "it", "pl", "ru", "pt", "zh", "ja"];

export const CURRENT_YEAR = new Date().getFullYear();

export function shortId(openalexId) {
  return (openalexId || "").split("/").pop();
}

export function authorsLine(authors, max = 3, etAl = "et al.") {
  const list = (authors || []).filter(Boolean);
  if (list.length <= max) return list.join(", ");
  return `${list.slice(0, max).join(", ")} ${etAl}`;
}

/** Best link to read the publication: PDF, open-access copy, DOI, or landing page. */
export function bestLinks(pub) {
  return {
    pdf: pub?.pdf_url || null,
    page: pub?.landing_page_url || pub?.oa_url || null,
    doi: pub?.doi || null,
  };
}

export function bareDoi(doi) {
  return (doi || "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
}

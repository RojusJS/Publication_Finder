import api from "./client";

export const searchPublications = (params, signal) =>
  api.get("/search/publications/", { params, signal }).then((r) => r.data);

export const getPublication = (id) =>
  api.get("/search/publications/detail/", { params: { id } }).then((r) => r.data);

export const getCitationNetwork = (id, params) =>
  api.get("/search/publications/network/", { params: { id, ...params } }).then((r) => r.data);

export const getCitation = (id, style) =>
  api.get("/search/publications/cite/", { params: { id, style } }).then((r) => r.data);

export const searchAuthors = (q, page = 1, signal) =>
  api.get("/search/authors/", { params: { q, page }, signal }).then((r) => r.data);

export const getAuthor = (id) => api.get("/search/authors/detail/", { params: { id } }).then((r) => r.data);

export const getAuthorWorks = (id, page = 1, sort = "cited_by_count_desc") =>
  api.get("/search/authors/works/", { params: { id, page, sort } }).then((r) => r.data);

export const autocompleteInstitutions = (q, signal) =>
  api.get("/search/institutions/autocomplete/", { params: { q }, signal }).then((r) => r.data.results);

export const getSearchHistory = () => api.get("/history/").then((r) => r.data);
export const deleteSearchHistoryEntry = (id) => api.delete(`/history/${id}/`);
export const clearSearchHistory = () => api.delete("/history/");

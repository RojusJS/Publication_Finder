import apiClient from "./apiClient";

const API_BASE = "http://127.0.0.1:8000";

export async function searchPublications(query, filters = {}) {
  const params = new URLSearchParams();
  params.set("q", query);

  if (filters.yearFrom) params.set("year_from", filters.yearFrom);
  if (filters.yearTo) params.set("year_to", filters.yearTo);
  if (filters.oa === true) params.set("oa", "true");
  if (filters.oa === false) params.set("oa", "false");
  if (filters.type) params.set("type", filters.type);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.searchBy) params.set("search_by", filters.searchBy);
  if (filters.institutionId)
    params.set("institution_id", filters.institutionId);
  if (filters.author) params.set("author", filters.author);
  params.set("page", filters.page ?? 1);

  const url = `${API_BASE}/api/search/publications/?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch (e) {}
    throw new Error(`Request failed (${response.status}). ${details}`);
  }

  return await response.json();
}

export async function getPublicationDetail(openalexId) {
  const params = new URLSearchParams();
  params.set("id", openalexId);

  const url = `${API_BASE}/api/search/publications/detail/?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch (e) {}
    throw new Error(`Request failed (${response.status}). ${details}`);
  }

  return await response.json();
}

export const searchAuthors = async (query) => {
  const response = await apiClient.get("/search/authors/", { params: { q: query } });
  return response.data;
};
 
export const getAuthorDetail = async (authorId) => {
  const response = await apiClient.get("/search/authors/detail/", { params: { id: authorId } });
  return response.data;
};

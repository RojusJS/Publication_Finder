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

  const url = `${API_BASE}/api/search/publications/?q=${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch (e) {
        //ignore
    }
    throw new Error(`Request failed (${response.status}). ${details}`);
  }

  const data = await response.json();
  return data; 
}
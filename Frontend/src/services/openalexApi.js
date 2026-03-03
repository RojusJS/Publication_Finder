const API_BASE = "http://127.0.0.1:8000";

export async function searchPublications(query) {
  const url = `${API_BASE}/api/search/publications/?q=${encodeURIComponent(query)}`;

  const response = await fetch(url);

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch () {}
    throw new Error(`Request failed (${response.status}). ${details}`);
  }

  const data = await response.json();
  return data; 
}
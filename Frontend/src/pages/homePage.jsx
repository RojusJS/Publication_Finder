import { useState } from "react";
import SearchBar from "../components/searchBar";
import PublicationCard from "../components/publicationCard";
import { searchPublications } from "../services/openalexApi";

function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await searchPublications(query);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Nepavyko gauti publikacijų");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ fontFamily: "Times New Roman", fontSize: "20px" }}>
          <h1>Publikacijų paieška</h1>
        </div>

        <SearchBar
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          disabled={loading}
        />

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div style={{ marginTop: "20px", width: "100%" }}>
          {results.map((pub, index) => (
            <PublicationCard key={pub.openalex_id ?? index} pub={pub} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
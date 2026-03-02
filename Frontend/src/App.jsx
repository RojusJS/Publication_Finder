import { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/search/publications/?q=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError("Failed to fetch publications");
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
        <h1>Publikacijų paieška</h1>

        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Įveskite užklausą"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ padding: "8px", width: "300px" }}
          />

          <button
            onClick={handleSearch}
            style={{ marginLeft: "10px", padding: "8px 16px" }}
          >
            Ieškoti
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div style={{ marginTop: "20px", width: "100%" }}>
          {results.map((pub, index) => (
            <div
              key={index}
              style={{
                background: "#2a2a2a",
                padding: "15px",
                marginBottom: "15px",
                borderRadius: "8px",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0 }}>{pub.title}</h3>
                <button style={{ padding: "4px 10px", flexShrink: 0 }}>
                  ...
                </button>
              </div>

              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span>Išleidimo metai: {pub.year}</span>

                {pub.doi && (
                  <span>
                    DOI:{" "}
                    <a href={pub.doi} target="_blank">
                      {pub.doi}
                    </a>
                  </span>
                )}

                {pub.pdf_url && (
                  <a href={pub.pdf_url} target="_blank">
                    Atidaryti PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;

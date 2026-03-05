import { useState } from "react";
import SearchBar from "../components/searchBar";
import PublicationCard from "../components/publicationCard";
import { searchPublications } from "../services/openalexApi";
import FiltersBar from "../components/filterBar";
import HeaderBar from "../components/topHeaderBar";
import AuthModal from "../components/AuthModal";

function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [oaOnly, setOaOnly] = useState(false);
  const [type, setType] = useState("");
  const [sort, setSort] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState(null);

  const handleLoginClick = () => setAuthMode("login");
  const handleRegisterClick = () => setAuthMode("register");
  const closeAuthModal = () => setAuthMode(null);

  const handleAuthSubmit = (payload) => {
    console.log("Auth submit:", authMode, payload);
    closeAuthModal();
  };

  const handleAvatarClick = () => {
    alert("User nustatymai");
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await searchPublications(query, {
        yearFrom,
        yearTo,
        oa: oaOnly ? true : undefined,
        type: type || undefined,
        sort: sort || undefined,
      });
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Nepavyko gauti publikacijų");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <HeaderBar
        isLoggedIn={isLoggedIn}
        onLogin={handleLoginClick}
        onRegister={handleRegisterClick}
        onAvatarClick={handleAvatarClick}
      />
      <AuthModal
        mode={authMode === "register" ? "register" : "login"}
        open={authMode !== null}
        onCancel={closeAuthModal}
        onSubmit={handleAuthSubmit}
      />
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

          <FiltersBar
            yearFrom={yearFrom}
            setYearFrom={setYearFrom}
            yearTo={yearTo}
            setYearTo={setYearTo}
            type={type}
            setType={setType}
            oaOnly={oaOnly}
            setOaOnly={setOaOnly}
            sort={sort}
            setSort={setSort}
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
    </div>
  );
}

export default HomePage;

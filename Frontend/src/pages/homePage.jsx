import { useEffect, useState } from "react";
import SearchBar from "../components/searchBar";
import PublicationCard from "../components/publicationCard";
import { searchPublications } from "../services/openalexApi";
import FiltersBar from "../components/filterBar";
import HeaderBar from "../components/topHeaderBar";
import AuthModal from "../components/AuthModal";
import ProjectsBar from "../components/projectsBar";
import CreateProjectModal from "../components/projectsModal";
import { getProjects, createProject } from "../services/projectApi";

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
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const handleLoginClick = () => setAuthMode("login");
  const handleRegisterClick = () => setAuthMode("register");
  const closeAuthModal = () => setAuthMode(null);

  const handleAuthSubmit = async () => {
    setIsLoggedIn(true);
    closeAuthModal();
    await fetchProjects();
  };

  useEffect(() => {
    const access = localStorage.getItem("access");

    if (access) {
      setIsLoggedIn(true);
      fetchProjects();
    }
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error("Nepavyko pasiekti projektus.", err);
    }
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

  const handleOpenCreateProject = () => {
    if (!isLoggedIn) {
      alert("Pirmiausia prisijunkite.");
      return;
    }
    setIsCreateProjectOpen(true);
  };

  const handleCloseCreateProject = () => {
    setIsCreateProjectOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setProjects([]);
  };

  const handleCreateProject = async (projectData) => {
    try {
      const newProject = await createProject(projectData);
      setProjects((prev) => [newProject, ...prev]);
      setIsCreateProjectOpen(false);
    } catch (err) {
      console.error("Nepavyko sukurti projekto:", err);
      alert("Nepavyko sukurti projekto.");
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <HeaderBar
        isLoggedIn={isLoggedIn}
        onLogin={handleLoginClick}
        onRegister={handleRegisterClick}
        onLogout={handleLogout}
      />
      <AuthModal
        mode={authMode === "register" ? "register" : "login"}
        open={authMode !== null}
        onCancel={closeAuthModal}
        onSubmit={handleAuthSubmit}
      />
      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={handleCloseCreateProject}
        onCreate={handleCreateProject}
      />

      <div
        style={{
          display: "flex",
          width: "100%",
          alignItems: "stretch",
          position: "relative",
        }}
      >
        <ProjectsBar
          onCreateProjectClick={handleOpenCreateProject}
          isLoggedIn={isLoggedIn}
          projects={projects}
        />

        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "1000px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxSizing: "border-box",
          }}
        >
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
                <PublicationCard
                  key={pub.openalex_id ?? index}
                  pub={pub}
                  projects={projects}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

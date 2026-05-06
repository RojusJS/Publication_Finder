import { useEffect, useState, useRef } from "react";
import SearchBar from "../components/searchBar";
import PublicationCard from "../components/publicationCard";
import AuthorCard from "../components/AuthorCard";
import { searchPublications, searchAuthors } from "../services/openalexApi";
import FiltersBar from "../components/filterBar";
import HeaderBar from "../components/topHeaderBar";
import AuthModal from "../components/AuthModal";
import ProjectsBar from "../components/projectsBar";
import CreateProjectModal from "../components/projectsModal";
import ProjectView from "../components/ProjectView";
import { getProjects, createProject } from "../services/projectApi";
import apiClient from "../services/apiClient";
import { useLanguage } from "../components/language";

function HomePage() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [authorResults, setAuthorResults] = useState([]);
  const [authorPage, setAuthorPage] = useState(1);
  const [authorTotalPages, setAuthorTotalPages] = useState(1);
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
  const [selectedPubs, setSelectedPubs] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [author, setAuthor] = useState("");
  const [searchBy, setSearchBy] = useState("title");
  const [activeProject, setActiveProject] = useState(null);
  const handleLoginClick = () => setAuthMode("login");
  const handleRegisterClick = () => setAuthMode("register");
  const closeAuthModal = () => setAuthMode(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const TOTAL_PAGES = 10;
  const resultsRef = useRef(null);

  useEffect(() => {
    setPage(1);
  }, [yearFrom, yearTo, oaOnly, type, sort]);

  const handleAuthSubmit = async () => {
    setIsLoggedIn(true);
    closeAuthModal();
    try {
      const { data } = await apiClient.get("/auth/me/");
      localStorage.setItem("is_staff", data.is_staff);
    } catch {}
    await fetchProjects();
  };

  useEffect(() => {
    const access = localStorage.getItem("access");
    if (access) {
      setIsLoggedIn(true);
      apiClient
        .get("/auth/me/")
        .then(({ data }) => {
          localStorage.setItem("is_staff", data.is_staff);
        })
        .catch(() => {});
      fetchProjects();
    }
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error("Nepavyko pasiekti projektų", err);
    }
  };

  const handleSearch = async (
    overrideQuery,
    overrideSearchBy,
    overridePage,
  ) => {
    const q = overrideQuery ?? query;
    const by = overrideSearchBy ?? searchBy;
    const p = overridePage ?? page;
    if (!q.trim() && !institution) return;
    setLoading(true);
    setError(null);
    setAuthorResults([]);
    setResults([]);
    setTotalPages(1);
    try {
      if (by === "author" && !institution) {
        const data = await searchAuthors(q);
        setAuthorResults(data.results || []);
        setAuthorTotalPages(
          Math.min(Math.ceil((data.total_count || 0) / 10), 10),
        );
        setAuthorPage(1);
      } else {
        const data = await searchPublications(
          institution ? institution.id : q,
          {
            yearFrom,
            yearTo,
            author: author || undefined,
            oa: oaOnly ? true : undefined,
            type: type || undefined,
            sort: sort || undefined,
            searchBy: institution ? "institution" : by,
            page: p,
          },
        );
        setResults(data.results || []);
        const total = Math.min(
          Math.ceil((data.total_count || 0) / 10),
          TOTAL_PAGES,
        );
        setTotalPages(total);
      }
    } catch (err) {
      setError(err.message || "Nepavyko gauti rezultatų");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorPageChange = async (newPage) => {
    setAuthorPage(newPage);
    setLoading(true);
    setError(null);
    try {
      const data = await searchAuthors(query, newPage);
      setAuthorResults(data.results || []);
      if (resultsRef.current)
        resultsRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Nepavyko gauti autorių");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    handleSearch(query, searchBy, newPage);
    if (resultsRef.current)
      resultsRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchWithQuery = (q, by) => {
    setQuery(q);
    setSearchBy(by);
    setPage(1);
    handleSearch(q, by, 1);
  };

  const handleOpenCreateProject = () => {
    if (!isLoggedIn) {
      showToast("Pirmiausia prisijunkite.");
      return;
    }
    setIsCreateProjectOpen(true);
  };

  const handleToggleSelect = (pub) => {
    setSelectedPubs((prev) =>
      prev.find((p) => p.openalex_id === pub.openalex_id)
        ? prev.filter((p) => p.openalex_id !== pub.openalex_id)
        : [...prev, pub],
    );
  };

  const handleClearSelected = () => setSelectedPubs([]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setProjects([]);
    setActiveProject(null);
  };

  const handleCreateProject = async (projectData) => {
    try {
      const newProject = await createProject(projectData);
      setProjects((prev) => [newProject, ...prev]);
      setIsCreateProjectOpen(false);
    } catch (err) {
      console.error("Nepavyko sukurti projekto:", err);
      showToast("Nepavyko sukurti projekto.");
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <HeaderBar
        isLoggedIn={isLoggedIn}
        onLogin={handleLoginClick}
        onRegister={handleRegisterClick}
        onLogout={handleLogout}
        onInvitationAccepted={fetchProjects}
      />
      <AuthModal
        mode={authMode === "register" ? "register" : "login"}
        open={authMode !== null}
        onCancel={closeAuthModal}
        onSubmit={handleAuthSubmit}
      />
      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreate={handleCreateProject}
      />

      <div
        style={{
          display: "flex",
          width: "100%",
          alignItems: "flex-start",
          height: "calc(100vh - 52px)",
          overflow: "hidden",
          position: activeProject ? "static" : "relative",
          background: "#f0f2f5",
        }}
      >
        <ProjectsBar
          onCreateProjectClick={handleOpenCreateProject}
          isLoggedIn={isLoggedIn}
          projects={projects}
          activeProjectId={activeProject?.id ?? null}
          onProjectDeleted={(id) => {
            setProjects((prev) => prev.filter((p) => p.id !== id));
            if (activeProject?.id === id) setActiveProject(null);
          }}
          onProjectClick={(project) => setActiveProject(project)}
        />

        <div
          style={
            activeProject
              ? {
                  flex: 1,
                  minWidth: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  boxSizing: "border-box",
                  height: "100%",
                  overflow: "hidden",
                  background: "#ffffff",
                }
              : {
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "100%",
                  maxWidth: "1200px",
                  padding: "0 20px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  boxSizing: "border-box",
                  height: "100%",
                }
          }
        >
          {activeProject ? (
            <ProjectView
              project={activeProject}
              onClose={() => setActiveProject(null)}
              onProjectDeleted={(id) => {
                setProjects((prev) => prev.filter((p) => p.id !== id));
                setActiveProject(null);
              }}
              onProjectUpdated={(updated) => {
                setProjects((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p)),
                );
                setActiveProject(updated);
              }}
              projects={projects}
              institutionName={institution?.display_name}
            />
          ) : (
            <>
              <SearchBar
                query={query}
                setQuery={setQuery}
                author={author}
                setAuthor={setAuthor}
                onSearch={handleSearch}
                onSearchWithQuery={handleSearchWithQuery}
                disabled={loading}
                searchBy={searchBy}
                setSearchBy={setSearchBy}
                activeFilters={{ yearFrom, yearTo, type, oaOnly }}
              />

              {loading && (
                <p
                  style={{
                    color: "#7a90aa",
                    fontFamily: "Times New Roman",
                    fontSize: "14px",
                  }}
                >
                  {t.loading}
                </p>
              )}
              {error && (
                <p
                  style={{
                    color: "#c0392b",
                    fontFamily: "Times New Roman",
                    fontSize: "14px",
                  }}
                >
                  {error}
                </p>
              )}

              <div
                ref={resultsRef}
                style={{
                  marginTop: "8px",
                  width: "100%",
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                {authorResults.length > 0 && (
                  <>
                    <p
                      style={{
                        margin: "0 0 10px",
                        fontSize: "12px",
                        color: "#7a90aa",
                        fontFamily: "Times New Roman",
                      }}
                    >
                      Rasta autorių
                    </p>
                    {authorResults.map((a, index) => (
                      <AuthorCard
                        key={a.id ?? index}
                        author={a}
                        projects={projects}
                      />
                    ))}
                    {authorTotalPages > 1 && (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          justifyContent: "center",
                          padding: "16px 0",
                          flexWrap: "wrap",
                        }}
                      >
                        {Array.from(
                          { length: authorTotalPages },
                          (_, i) => i + 1,
                        ).map((p) => (
                          <button
                            key={p}
                            onClick={() => handleAuthorPageChange(p)}
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "8px",
                              border:
                                p === authorPage
                                  ? "2px solid #1e2d4a"
                                  : "1px solid #dce3ed",
                              background:
                                p === authorPage ? "#1e2d4a" : "#ffffff",
                              color: p === authorPage ? "#ffffff" : "#5a7090",
                              cursor: "pointer",
                              fontFamily: "Times New Roman",
                              fontSize: "14px",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {results.map((pub, index) => (
                  <PublicationCard
                    key={pub.openalex_id ?? index}
                    pub={pub}
                    projects={projects}
                    institutionName={institution?.display_name}
                    isSelected={selectedPubs.some(
                      (p) => p.openalex_id === pub.openalex_id,
                    )}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
                {authorResults.length === 0 &&
                  !loading &&
                  results.length > 0 &&
                  totalPages > 1 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        justifyContent: "center",
                        padding: "16px 0",
                        flexWrap: "wrap",
                      }}
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "8px",
                              border:
                                p === page
                                  ? "2px solid #1e2d4a"
                                  : "1px solid #dce3ed",
                              background: p === page ? "#1e2d4a" : "#fff",
                              color: p === page ? "#fff" : "#5a7090",
                              cursor: "pointer",
                              fontFamily: "Times New Roman",
                              fontSize: "14px",
                              padding: 0,
                              lineHeight: "1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {p}
                          </button>
                        ),
                      )}
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
        {!activeProject && (
          <div style={{ marginLeft: "auto" }}>
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
              institution={institution}
              setInstitution={setInstitution}
              selectedPubs={selectedPubs}
              projects={projects}
              onClearSelected={handleClearSelected}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;

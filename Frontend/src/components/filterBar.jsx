import { useState, useEffect, useRef } from "react";
import { useLanguage } from "./language";
import { getFolders, savePublication } from "../services/projectApi";
import { useToast } from "./toastContext";

function FiltersBar({
  yearFrom,
  setYearFrom,
  yearTo,
  setYearTo,
  type,
  setType,
  oaOnly,
  setOaOnly,
  sort,
  setSort,
  institution,
  setInstitution,
  selectedPubs = [],
  projects = [],
  onClearSelected,
}) {
  const [institutionQuery, setInstitutionQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!institutionQuery.trim() || institution) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const resp = await fetch(
          `https://api.openalex.org/autocomplete/institutions?q=${encodeURIComponent(institutionQuery)}`,
        );
        const data = await resp.json();
        setSuggestions(data.results || []);
        setDropdownOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
  }, [institutionQuery, institution]);

  const handleSelect = (item) => {
    setInstitution({ id: item.id, display_name: item.display_name });
    setInstitutionQuery(item.display_name);
    setDropdownOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setInstitution(null);
    setInstitutionQuery("");
    setSuggestions([]);
    setDropdownOpen(false);
  };

  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setFolders([]);
    setFoldersLoading(true);
    try {
      const data = await getFolders(project.id);
      setFolders(data);
    } catch {
      showToast("Nepavyko gauti aplankų");
    } finally {
      setFoldersLoading(false);
    }
  };

  const handleSaveAll = async (folderId) => {
    setSaving(true);
    try {
      await Promise.all(
        selectedPubs.map((pub) =>
          savePublication(selectedProject.id, folderId, pub),
        ),
      );
      setSaveOpen(false);
      setSelectedProject(null);
      setFolders([]);
      onClearSelected();
    } catch {
      showToast("Nepavyko išsaugoti");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    display: "block",
    margin: "0 0 5px",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7a90aa",
    fontFamily: "Times New Roman",
  };

  const inputStyle = {
    width: "100%",
    padding: "7px 10px",
    borderRadius: "6px",
    border: "1px solid #c8d4e3",
    fontFamily: "Times New Roman",
    fontSize: "13px",
    color: "#1e2d4a",
    boxSizing: "border-box",
    background: "#fff",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const selectStyle = {
    width: "100%",
    padding: "7px 30px 7px 10px",
    borderRadius: "6px",
    border: "1px solid #c8d4e3",
    fontFamily: "Times New Roman",
    fontSize: "13px",
    color: "#1e2d4a",
    boxSizing: "border-box",
    background: "#fff",
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        width: "220px",
        minWidth: "220px",
        padding: "20px 16px",
        boxSizing: "border-box",
        fontFamily: "Times New Roman",
        background: "#eef1f6",
        borderLeft: "1px solid #dce3ed",
      }}
    >
      <p
        style={{
          margin: "0 0 18px",
          fontSize: "10px",
          fontWeight: "700",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#1e2d4a",
        }}
      >
        {t.filters}
      </p>

      <div style={{ marginBottom: "14px" }}>
        <label style={labelStyle}>{t.year_from}</label>
        <input
          type="number"
          value={yearFrom}
          onChange={(e) => setYearFrom(e.target.value)}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
        />
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label style={labelStyle}>{t.year_to ?? "METAI IKI"}</label>
        <input
          type="number"
          value={yearTo}
          onChange={(e) => setYearTo(e.target.value)}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
        />
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label style={labelStyle}>{t.type}</label>
        <div style={{ position: "relative" }}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={selectStyle}
          >
            <option value="">{t.type_all}</option>
            <option value="journal-article">Journal article</option>
            <option value="book-chapter">Book chapter</option>
            <option value="book">Book</option>
            <option value="preprint">Preprint</option>
            <option value="proceedings-article">Proceedings article</option>
          </select>
          <span
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              fontSize: "10px",
              color: "#7a90aa",
            }}
          >
            ▼
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label style={labelStyle}>{t.sort}</label>
        <div style={{ position: "relative" }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={selectStyle}
          >
            <option value="">{t.sort_default}</option>
            <option value="year_desc">{t.sort_year_desc}</option>
            <option value="year_asc">{t.sort_year_asc}</option>
            <option value="cited_by_count_desc">Citavimai: daugiausia</option>
            <option value="cited_by_count_asc">Citavimai: mažiausia</option>
          </select>
          <span
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              fontSize: "10px",
              color: "#7a90aa",
            }}
          >
            ▼
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label
          style={{
            fontSize: "13px",
            color: "#1e2d4a",
            fontFamily: "Times New Roman",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            margin: 0,
          }}
        >
          <input
            type="checkbox"
            checked={oaOnly}
            onChange={(e) => setOaOnly(e.target.checked)}
            style={{ accentColor: "#1e2d4a" }}
          />
          {t.open_access}
        </label>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label
          style={{
            fontSize: "13px",
            color: "#1e2d4a",
            fontFamily: "Times New Roman",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            margin: 0,
          }}
        >
          <input
            type="checkbox"
            checked={yearFrom === String(new Date().getFullYear() - 5)}
            onChange={(e) =>
              setYearFrom(
                e.target.checked ? String(new Date().getFullYear() - 5) : "",
              )
            }
            style={{ accentColor: "#1e2d4a" }}
          />
          Ne senesnės nei 5 m.
        </label>
      </div>

      <div
        style={{ height: "1px", background: "#dce3ed", margin: "6px 0 14px" }}
      />

      <div ref={dropdownRef} style={{ position: "relative" }}>
        <label style={labelStyle}>
          {t.institution}
          {loadingSuggestions && (
            <span
              style={{
                color: "#7a90aa",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {" "}
              …
            </span>
          )}
        </label>

        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder={t.institution_placeholder}
            value={institutionQuery}
            onChange={(e) => {
              setInstitutionQuery(e.target.value);
              if (institution) setInstitution(null);
            }}
            style={{
              ...inputStyle,
              background: institution ? "#e8eef7" : "#fff",
              borderColor: institution ? "#7fa8d4" : "#c8d4e3",
              paddingRight: institution ? "28px" : "10px",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = institution
                ? "#7fa8d4"
                : "#c8d4e3")
            }
          />
          {institution && (
            <button
              onClick={handleClear}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#7a90aa",
                fontSize: "13px",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {dropdownOpen && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "4px",
              background: "#fff",
              border: "1px solid #dce3ed",
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(30,45,74,0.12)",
              maxHeight: "220px",
              overflowY: "auto",
              zIndex: 1000,
            }}
          >
            {suggestions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f0f4fa")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                style={{
                  padding: "9px 12px",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  borderBottom: "1px solid #f0f4fa",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#1e2d4a",
                    fontFamily: "Times New Roman",
                  }}
                >
                  {item.display_name}
                </p>
                {item.hint && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "11px",
                      color: "#7a90aa",
                      fontFamily: "sans-serif",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.hint}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPubs.length > 0 && (
        <div ref={saveRef} style={{ position: "relative", marginTop: "20px" }}>
          <button
            onClick={() => {
              setSaveOpen((p) => !p);
              setSelectedProject(null);
              setFolders([]);
            }}
            disabled={saving}
            style={{
              width: "100%",
              padding: "9px",
              background: saving ? "#7a90aa" : "#1e2d4a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Times New Roman",
              fontSize: "13px",
              fontWeight: "600",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.background = "#2a3f63";
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.background = "#1e2d4a";
            }}
          >
            {saving ? t.saving : `${t.save} (${selectedPubs.length})`}
          </button>

          {saveOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: 0,
                background: "#fff",
                border: "1px solid #dce3ed",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(30,45,74,0.12)",
                minWidth: "200px",
                zIndex: 20,
                overflow: "hidden",
              }}
            >
              {!selectedProject &&
                (projects.length === 0 ? (
                  <div
                    style={{
                      padding: "10px 14px",
                      fontFamily: "Times New Roman",
                      color: "#7a90aa",
                      fontSize: "13px",
                    }}
                  >
                    {t.no_projects_dropdown}
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      onMouseEnter={() => handleSelectProject(project)}
                      style={{ position: "relative" }}
                    >
                      <div
                        style={{
                          padding: "9px 14px",
                          cursor: "pointer",
                          fontFamily: "Times New Roman",
                          fontSize: "13px",
                          color: "#1e2d4a",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background:
                            selectedProject?.id === project.id
                              ? "#f0f4fa"
                              : "none",
                        }}
                      >
                        {project.name}
                        <span style={{ color: "#c8d4e3", fontSize: "11px" }}>
                          ▸
                        </span>
                      </div>
                    </div>
                  ))
                ))}

              {selectedProject && (
                <>
                  <button
                    onClick={() => {
                      setSelectedProject(null);
                      setFolders([]);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 14px",
                      background: "#f0f4fa",
                      border: "none",
                      borderBottom: "1px solid #dce3ed",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      fontSize: "12px",
                      color: "#7a90aa",
                    }}
                  >
                    ← {selectedProject.name}
                  </button>
                  {foldersLoading ? (
                    <div
                      style={{
                        padding: "10px 14px",
                        color: "#7a90aa",
                        fontSize: "13px",
                      }}
                    >
                      {t.loading}
                    </div>
                  ) : folders.length === 0 ? (
                    <div
                      style={{
                        padding: "10px 14px",
                        color: "#7a90aa",
                        fontSize: "13px",
                      }}
                    >
                      {t.no_folders_dropdown}
                    </div>
                  ) : (
                    folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => handleSaveAll(folder.id)}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f0f4fa")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "none")
                        }
                        style={{
                          width: "100%",
                          padding: "9px 14px",
                          background: "none",
                          border: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "Times New Roman",
                          fontSize: "13px",
                          color: "#1e2d4a",
                          boxSizing: "border-box",
                        }}
                      >
                        {folder.name}
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FiltersBar;

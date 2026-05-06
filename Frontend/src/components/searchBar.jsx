import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "./language";

function SearchBar({
  query,
  setQuery,
  author,
  setAuthor,
  onSearch,
  onSearchWithQuery,
  disabled,
  searchBy,
  setSearchBy,
  activeFilters = {},
}) {
  const [history, setHistory] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    const saved = localStorage.getItem("searchHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveToHistory = (q, by) => {
    if (!q.trim()) return;
    const entry = { query: q.trim(), searchBy: by, filters: activeFilters };
    const updated = [
      entry,
      ...JSON.parse(localStorage.getItem("searchHistory") || "[]").filter(
        (h) => !(h.query === entry.query && h.searchBy === by),
      ),
    ].slice(0, 8);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
    setHistory(updated);
  };

  const handleSearch = () => {
    saveToHistory(query, searchBy);
    setDropdownOpen(false);
    onSearch();
  };

  const handleHistoryClick = (entry) => {
    saveToHistory(entry.query, entry.searchBy);
    setDropdownOpen(false);
    onSearchWithQuery(entry.query, entry.searchBy);
  };

  const handleClearHistory = (e) => {
    e.stopPropagation();
    localStorage.removeItem("searchHistory");
    setHistory([]);
  };

  const handleDeleteEntry = (e, index) => {
    e.stopPropagation();
    const updated = history.filter((_, i) => i !== index);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
    setHistory(updated);
  };

  const inputStyle = {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "1.5px solid #c8d4e3",
    fontFamily: "Times New Roman",
    fontSize: "15px",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#1e2d4a",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const isAuthorMode = searchBy === "author";

  return (
    <div
      style={{
        width: "100%",
        padding: "40px 0 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {isAuthorMode && (
        <p
          style={{
            margin: "0 0 2px",
            fontSize: "12px",
            color: "#7a90aa",
            fontFamily: "Times New Roman",
            letterSpacing: "0.02em",
          }}
        >
        </p>
      )}

      <div
        ref={containerRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          position: "relative",
        }}
      >
        <div style={{ position: "relative" }}>
          {searchBy === "title_and_author" ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder={t.search_placeholder_title}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                  if (e.key === "Escape") setDropdownOpen(false);
                }}
                style={{ ...inputStyle, width: "240px" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#1e2d4a";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(30,45,74,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#c8d4e3";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <input
                type="text"
                placeholder={t.search_placeholder_author}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                  if (e.key === "Escape") setDropdownOpen(false);
                }}
                style={{ ...inputStyle, width: "240px" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#1e2d4a";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(30,45,74,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#c8d4e3";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          ) : (
            <input
              type="text"
              placeholder={
                isAuthorMode
                  ? "Įveskite autoriaus vardą..."
                  : searchBy === "institution"
                    ? t.search_placeholder_institution
                    : t.search_placeholder_title
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={(e) => {
                setDropdownOpen(true);
                e.currentTarget.style.borderColor = "#1e2d4a";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(30,45,74,0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#c8d4e3";
                e.currentTarget.style.boxShadow = "none";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
                if (e.key === "Escape") setDropdownOpen(false);
              }}
              style={{ ...inputStyle, width: "480px" }}
            />
          )}

          {dropdownOpen && history.length > 0 && !isAuthorMode && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                width: "100%",
                background: "#ffffff",
                border: "1.5px solid #dce3ed",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(30,45,74,0.12)",
                zIndex: 1000,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 14px 6px",
                  borderBottom: "1px solid #eef1f6",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#7a90aa",
                    fontFamily: "Times New Roman",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {t.search_history}
                </span>
                <button
                  onClick={handleClearHistory}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#7a90aa",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontFamily: "Times New Roman",
                    padding: 0,
                  }}
                >
                  {t.clear_all}
                </button>
              </div>
              {history.map((entry, i) => (
                <div
                  key={i}
                  onClick={() => handleHistoryClick(entry)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f0f4fa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#ffffff")
                  }
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "9px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f4f6f9",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: "Times New Roman",
                        fontSize: "14px",
                        color: "#1e2d4a",
                      }}
                    >
                      {entry.query}
                    </span>
                    {entry.filters &&
                      Object.keys(entry.filters).some(
                        (k) => entry.filters[k],
                      ) && (
                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            flexWrap: "wrap",
                            marginTop: "4px",
                          }}
                        >
                          {entry.filters.yearFrom && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                borderRadius: "10px",
                                background: "#eef1f6",
                                color: "#5a7090",
                                border: "1px solid #dce3ed",
                              }}
                            >
                              nuo {entry.filters.yearFrom}
                            </span>
                          )}
                          {entry.filters.yearTo && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                borderRadius: "10px",
                                background: "#eef1f6",
                                color: "#5a7090",
                                border: "1px solid #dce3ed",
                              }}
                            >
                              iki {entry.filters.yearTo}
                            </span>
                          )}
                          {entry.filters.type && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                borderRadius: "10px",
                                background: "#eef1f6",
                                color: "#5a7090",
                                border: "1px solid #dce3ed",
                              }}
                            >
                              {entry.filters.type}
                            </span>
                          )}
                          {entry.filters.oaOnly && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                borderRadius: "10px",
                                background: "#e8f5ec",
                                color: "#1e6640",
                                border: "1px solid #b8dfc8",
                              }}
                            >
                              Open Access
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteEntry(e, i)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#1e2d4a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#bbbbbb")
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "#bbbbbb",
                      cursor: "pointer",
                      fontSize: "13px",
                      padding: "0 0 0 8px",
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          disabled={disabled}
          style={{
            padding: "10px 20px",
            background: disabled ? "#7a90aa" : "#1e2d4a",
            border: "none",
            borderRadius: "8px",
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily: "Times New Roman",
            fontSize: "14px",
            color: "#ffffff",
            fontWeight: "600",
            letterSpacing: "0.02em",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.background = "#2a3f63";
          }}
          onMouseLeave={(e) => {
            if (!disabled) e.currentTarget.style.background = "#1e2d4a";
          }}
        >
          {t.search}
        </button>
      </div>

      <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
        {[
          { key: "title", label: t.by_title },
          { key: "author", label: t.by_author },
          { key: "title_and_author", label: t.by_title_and_author },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSearchBy(key)}
            style={{
              padding: "4px 14px",
              borderRadius: "20px",
              border:
                searchBy === key
                  ? "1.5px solid #1e2d4a"
                  : "1.5px solid #c8d4e3",
              background: searchBy === key ? "#1e2d4a" : "#ffffff",
              color: searchBy === key ? "#ffffff" : "#7a90aa",
              cursor: "pointer",
              fontFamily: "Times New Roman",
              fontSize: "13px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (searchBy !== key) {
                e.currentTarget.style.borderColor = "#1e2d4a";
                e.currentTarget.style.color = "#1e2d4a";
              }
            }}
            onMouseLeave={(e) => {
              if (searchBy !== key) {
                e.currentTarget.style.borderColor = "#c8d4e3";
                e.currentTarget.style.color = "#7a90aa";
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SearchBar;

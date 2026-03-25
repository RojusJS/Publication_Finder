import React, { useState, useEffect, useRef } from "react";

function SearchBar({
  query,
  setQuery,
  onSearch,
  onSearchWithQuery,
  disabled,
  searchBy,
  setSearchBy,
}) {
  const [history, setHistory] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

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
    console.log("saveToHistory called with:", q, by);

    if (!q.trim()) {
      console.log("Not saving because query is empty");
      return;
    }

    const entry = { query: q.trim(), searchBy: by };
    const updated = [
      entry,
      ...JSON.parse(localStorage.getItem("searchHistory") || "[]").filter(
        (h) => !(h.query === entry.query && h.searchBy === by),
      ),
    ].slice(0, 8);

    console.log("Saving history:", updated);

    localStorage.setItem("searchHistory", JSON.stringify(updated));
    setHistory(updated);
  };
  const handleSearch = () => {
    console.log("handleSearch triggered");
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

  return (
    <div
      style={{
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div
        ref={containerRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          position: "relative",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder={
              searchBy === "author"
                ? "Įveskite autoriaus vardą"
                : searchBy === "institution"
                  ? "Įveskite institucijos pavadinimą"
                  : "Įveskite užklausą"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
              if (e.key === "Escape") setDropdownOpen(false);
            }}
            style={{
              padding: "8px 16px",
              width: "500px",
              borderRadius: "20px",
              border: "2px solid #514f58",
              fontFamily: "Times New Roman",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
          />

          {dropdownOpen && history.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                width: "100%",
                background: "#ffffff",
                border: "1.5px solid #d6d3dc",
                borderRadius: "14px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                zIndex: 1000,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 14px 4px",
                  borderBottom: "1px solid #f0eef4",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    fontFamily: "Times New Roman",
                  }}
                >
                  Paieškos istorija
                </span>
                <button
                  onClick={handleClearHistory}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#a09aad",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontFamily: "Times New Roman",
                    padding: "0",
                  }}
                >
                  Išvalyti viską
                </button>
              </div>

              {history.map((entry, i) => (
                <div
                  key={i}
                  onClick={() => handleHistoryClick(entry)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f5f3ff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#ffffff")
                  }
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f5f3f8",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: 0,
                    }}
                  >
  
                    <span
                      style={{
                        fontFamily: "Times New Roman",
                        fontSize: "14px",
                        color: "#333",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.query}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteEntry(e, i)}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#333")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#bbb")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#bbb",
                      cursor: "pointer",
                      fontSize: "14px",
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
            padding: "8px 16px",
            background: "#f0efef",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.7 : 1,
          }}
        >
          Ieškoti
        </button>
      </div>

      <div style={{ display: "flex", gap: "6px" }}>
        <button
          onClick={() => setSearchBy("title")}
          style={{
            padding: "4px 14px",
            borderRadius: "20px",
            border: "1.5px solid #514f58",
            background: searchBy === "title" ? "#5b5963" : "#ffffff",
            color: searchBy === "title" ? "#ffffff" : "#4e4c55",
            cursor: "pointer",
            fontFamily: "Times New Roman",
            fontSize: "14px",
          }}
        >
          Pavadinimas
        </button>
        <button
          onClick={() => setSearchBy("author")}
          style={{
            padding: "4px 14px",
            borderRadius: "20px",
            border: "1.5px solid #514f58",
            background: searchBy === "author" ? "#57555f" : "#ffffff",
            color: searchBy === "author" ? "#ffffff" : "#56545c",
            cursor: "pointer",
            fontFamily: "Times New Roman",
            fontSize: "14px",
          }}
        >
          Autorius
        </button>
      </div>
    </div>
  );
}

export default SearchBar;

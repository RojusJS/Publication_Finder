import { useState, useEffect, useRef } from "react";

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
}) {
  const [institutionQuery, setInstitutionQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

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
          `https://api.openalex.org/autocomplete/institutions?q=${encodeURIComponent(institutionQuery)}`
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

  const labelStyle = {
    fontFamily: "Times New Roman",
    fontSize: "13px",
    color: "#555",
    marginBottom: "4px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1.2px solid #000000",
    fontFamily: "Times New Roman",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  const selectStyle = {
    width: "100%",
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1.2px solid #000000",
    fontFamily: "Times New Roman",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#ffffff",
  };

  return (
    <div
      style={{
        width: "220px",
        minWidth: "220px",
        borderLeft: "2px solid #acacac",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily: "Times New Roman",
        background: "#f1f0f3",
        minHeight: "calc(100vh - 73px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.20)",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h3 style={{ margin: 0, fontFamily: "Times New Roman", fontSize: "16px" }}>Filtrai</h3>

      <div>
        <label style={labelStyle}>Metai nuo</label>
        <input
          type="number"
          placeholder="pvz. 2010"
          value={yearFrom}
          onChange={(e) => setYearFrom(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Metai iki</label>
        <input
          type="number"
          placeholder="pvz. 2024"
          value={yearTo}
          onChange={(e) => setYearTo(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Tipas</label>
        <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
          <option value="">Visi</option>
          <option value="journal-article">Journal article</option>
          <option value="book-chapter">Book chapter</option>
          <option value="book">Book</option>
          <option value="preprint">Preprint</option>
          <option value="proceedings-article">Proceedings article</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Rikiuoti pagal</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle}>
          <option value="">Numatytasis</option>
          <option value="year_desc">Metai: mažėjimo tvarka</option>
          <option value="year_asc">Metai: didėjimo tvarka</option>
        </select>
      </div>

      <div>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={oaOnly}
            onChange={(e) => setOaOnly(e.target.checked)}
          />
          Atviroji prieiga
        </label>
      </div>

      <div ref={dropdownRef} style={{ position: "relative" }}>
        <label style={labelStyle}>
          Institucija {loadingSuggestions && <span style={{ color: "#aaa" }}>...</span>}
        </label>
        <input
          type="text"
          placeholder="Ieškoti institucijos"
          value={institutionQuery}
          onChange={(e) => {
            setInstitutionQuery(e.target.value);
            if (institution) setInstitution(null);
          }}
          style={{
            ...inputStyle,
            background: institution ? "#f0eeee" : "#ffffff",
            border: institution ? "1.2px solid #514f58" : "1.2px solid #000000",
          }}
        />
        {institution && (
          <button
            onClick={handleClear}
            style={{
              marginTop: "6px",
              width: "100%",
              padding: "4px",
              borderRadius: "8px",
              border: "1px solid #000",
              background: "#e0e0e0",
              cursor: "pointer",
              fontSize: "13px",
              fontFamily: "Times New Roman",
            }}
          >
            ✕ Išvalyti
          </button>
        )}

        {dropdownOpen && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              background: "#fff",
              border: "1px solid #d6d6d6",
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              width: "260px",
              maxHeight: "220px",
              overflowY: "auto",
              zIndex: 1000,
            }}
          >
            {suggestions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1ebf5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "14px",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div style={{ fontWeight: "500" }}>{item.display_name}</div>
                {item.hint && (
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                    {item.hint}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FiltersBar;
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
          `https://api.openalex.org/autocomplete/institutions?q=${encodeURIComponent(
            institutionQuery,
          )}`,
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
    margin: "0 0 6px",
    fontSize: "12px",
    fontWeight: "500",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#000000",
    fontFamily: "Times New Roman",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "0.5px solid #979797",
    fontFamily: "Times New Roman",
    fontSize: "14px",
    color: "#2a2535",
    boxSizing: "border-box",
    background: "#ffffff",
    outline: "none",
  };

  const selectWrapStyle = {
    position: "relative",
    width: "100%",
  };

  const selectStyle = {
    width: "100%",
    padding: "8px 36px 8px 12px",
    borderRadius: "8px",
    border: "0.5px solid #979797",
    fontFamily: "Times New Roman",
    fontSize: "14px",
    color: "#2a2535",
    boxSizing: "border-box",
    background: "#ffffff",
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
        width: "240px",
        minWidth: "240px",
        padding: "20px 16px",
        boxSizing: "border-box",
        fontFamily: "Times New Roman",
        background: "#f3f3f307",
        borderLeft: "0.5px solid #ddd9e3",
      }}
    >
      <p
        style={{
          margin: "0 0 16px",
          fontSize: "11px",
          fontWeight: "500",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#000000",
          fontFamily: "Times New Roman",
        }}
      >
        Filtrai
      </p>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Metai nuo</label>
        <input
          type="number"
          placeholder="pvz. 2010"
          value={yearFrom}
          onChange={(e) => setYearFrom(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Metai iki</label>
        <input
          type="number"
          placeholder="pvz. 2024"
          value={yearTo}
          onChange={(e) => setYearTo(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Tipas</label>
        <div style={selectWrapStyle}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={selectStyle}
          >
            <option value="">Visi</option>
            <option value="journal-article">Journal article</option>
            <option value="book-chapter">Book chapter</option>
            <option value="book">Book</option>
            <option value="preprint">Preprint</option>
            <option value="proceedings-article">Proceedings article</option>
          </select>
          <span
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              fontSize: "12px",
              color: "#686666",
            }}
          >
            ▼
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Rikiuoti pagal</label>
        <div style={selectWrapStyle}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={selectStyle}
          >
            <option value="">Numatytasis</option>
            <option value="year_desc">Metai: mažėjimo tvarka</option>
            <option value="year_asc">Metai: didėjimo tvarka</option>
          </select>
          <span
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              fontSize: "12px",
              color: "#666565",
            }}
          >
            ▼
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            fontSize: "14px",
            color: "#2a2535",
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
          />
          Atviroji prieiga
        </label>
      </div>

      <div ref={dropdownRef} style={{ position: "relative" }}>
        <label style={labelStyle}>
          Institucija{" "}
          {loadingSuggestions && (
            <span style={{ color: "#9993a8", textTransform: "none" }}>...</span>
          )}
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
            background: institution ? "#eeebeb" : "#ffffff",
            border: institution
              ? "0.5px solid #58575f"
              : "0.5px solid #949494",
          }}
        />

        {dropdownOpen && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "6px",
              background: "#ffffff",
              border: "0.5px solid #979797",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
                  (e.currentTarget.style.background = "#ebebeb")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  borderBottom: "0.5px solid #ececec",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#2a2535",
                    fontFamily: "Times New Roman",
                  }}
                >
                  {item.display_name}
                </p>

                {item.hint && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "12px",
                      color: "#9993a8",
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
    </div>
  );
}

export default FiltersBar;
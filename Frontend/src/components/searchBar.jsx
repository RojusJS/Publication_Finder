import React from "react";

function SearchBar({ query, setQuery, onSearch, disabled }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <input
        type="text"
        placeholder="Įveskite užklausą"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
        style={{
          padding: "8px",
          width: "500px",
          borderRadius: "20px",
          border: "2px solid #514f58",
        }}
      />

      <button
        onClick={onSearch}
        disabled={disabled}
        style={{
          marginLeft: "10px",
          padding: "8px 16px",
          background: "#8b8b8b",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        Ieškoti
      </button>
    </div>
  );
}

export default SearchBar;
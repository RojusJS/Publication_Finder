import React from "react";

function SearchBar({ query, setQuery, onSearch, disabled, searchBy, setSearchBy }) {
  return (
    <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="text"
          placeholder={searchBy === "author" ? "Įveskite autoriaus vardą" : "Įveskite užklausą"}
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
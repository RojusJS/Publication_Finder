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
}) {
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
      <input
        type="number"
        placeholder="Metai nuo"
        value={yearFrom}
        onChange={(e) => setYearFrom(e.target.value)}
        style={{ padding: "6px", width: "120px", borderRadius: "10px", border: "1.2px solid #000000", }}
      />

      <input
        type="number"
        placeholder="Metai iki"
        value={yearTo}
        onChange={(e) => setYearTo(e.target.value)}
        style={{ padding: "6px", width: "120px", borderRadius: "10px", border: "1.2px solid #000000", }}
      />

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={{ padding: "6px", borderRadius: "10px" }}
      >
        <option value="">Tipas: visi</option>
        <option value="journal-article">Journal article</option>
        <option value="book-chapter">Book chapter</option>
        <option value="book">Book</option>
        <option value="preprint">Preprint</option>
        <option value="proceedings-article">Proceedings article</option>
      </select>

      <label style={{ display: "flex", alignItems: "center", gap: "6px", }}>
        <input
          type="checkbox"
          checked={oaOnly}
          onChange={(e) => setOaOnly(e.target.checked)}
        />
        Atviroji prieiga
      </label>

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        style={{ padding: "6px", borderRadius: "10px"}}
      >
        <option value="">Rikiuoti pagal</option>
        <option value="year_desc">Metai: mažėjimo tvarka</option>
        <option value="year_asc">Metai: didėjimo tvarka</option>
      </select>
    </div>
  );
}

export default FiltersBar;
import React from "react";

function PublicationCard({ pub }) {
  return (
    <div
      style={{
        background: "#ffffff",
        padding: "15px",
        marginBottom: "15px",
        borderRadius: "8px",
        width: "100%",
        border: "3px solid #514f58",
        fontFamily: "Times New Roman",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <h3 style={{ margin: 0 }}>{pub.title}</h3>
        <button
          type="button"
          style={{
            padding: "4px 10px",
            flexShrink: 0,
            background: "#8b8b8b",
            cursor: "pointer",
          }}
          onClick={() => alert("Vėliau čia bus meniu (pvz. Išsaugoti, Eksportuoti).")}
        >
          ...
        </button>
      </div>

      <div
        style={{
          marginTop: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <span>Išleidimo metai: {pub.year ?? "—"}</span>

        {pub.doi && (
          <span>
            DOI:{" "}
            <a href={pub.doi} target="_blank" rel="noreferrer">
              {pub.doi}
            </a>
          </span>
        )}

        {pub.pdf_url && (
          <a href={pub.pdf_url} target="_blank" rel="noreferrer">
            Atidaryti PDF
          </a>
        )}
      </div>
    </div>
  );
}

export default PublicationCard;
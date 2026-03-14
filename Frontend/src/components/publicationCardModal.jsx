import React from "react";
import Modal from "./modal";

function PublicationCardModal({ open, onClose, pub }) {
  if (!pub) return null;

  return (
    <Modal open={open} onClose={onClose} title={pub.title} maxWidth="700px">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          fontSize: "15px",
        }}
      >
        {pub.authors?.length > 0 && (
          <div>
            <strong>Autoriai:</strong> {pub.authors.join(", ")}
          </div>
        )}

        {pub.source_name && (
          <div>
            <strong>Šaltinis:</strong> {pub.source_name}
          </div>
        )}

        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {pub.year && (
            <div>
              <strong>Išleidimo metai:</strong> {pub.year}
            </div>
          )}
          {pub.type && (
            <div>
              <strong>Tipas:</strong> {pub.type}
            </div>
          )}
          {pub.language && (
            <div>
              <strong>Kalba:</strong> {pub.language.toUpperCase()}
            </div>
          )}
          {pub.cited_by_count != null && (
            <div>
              <strong>Citavimai:</strong> {pub.cited_by_count}
            </div>
          )}
          {pub.is_oa != null && (
            <div>
              <strong>Atvira prieiga:</strong> {pub.is_oa ? "Taip" : "Ne"}
            </div>
          )}
        </div>

        {pub.keywords?.length > 0 && (
          <div>
            <strong>Raktažodžiai:</strong>{" "}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginTop: "6px",
              }}
            >
              {pub.keywords.map((kw) => (
                <span
                  key={kw}
                  style={{
                    padding: "2px 10px",
                    borderRadius: "20px",
                    background: "#f0f0f0",
                    border: "1px solid #ccc",
                    fontSize: "13px",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {pub.abstract && (
          <div>
            <strong>Santrauka:</strong>
            <p
              style={{
                marginTop: "6px",
                marginBottom: 0,
                lineHeight: "1.6",
                color: "#333",
              }}
            >
              {pub.abstract}
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {pub.doi && (
            <span>
              <strong>DOI:</strong>{" "}
              <a href={pub.doi} target="_blank" rel="noreferrer">
                {pub.doi}
              </a>
            </span>
          )}
          {pub.landing_page_url && (
            <a href={pub.landing_page_url} target="_blank" rel="noreferrer">
              Atidaryti publikacijos puslapį
            </a>
          )}
          {pub.pdf_url && (
            <a href={pub.pdf_url} target="_blank" rel="noreferrer">
              Atidaryti PDF
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default PublicationCardModal;

import { useState, useEffect, useRef } from "react";
import { savePublication } from "../services/projectApi";
import { createPortal } from "react-dom";
import PublicationCardModal from "./publicationCardModal";

function PublicationCard({
  pub,
  projects,
  institutionName,
  isSelected,
  onToggleSelect,
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#e6e6e6")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = isSelected
            ? "#eef0ff"
            : "#ffffff")
        }
        style={{
          background: isSelected ? "#eef0ff" : "#ffffff",
          padding: "16px 20px",
          marginBottom: "10px",
          borderRadius: "12px",
          width: "100%",
          border: isSelected ? "0.5px solid #7a78c8" : "0.5px solid #86848a",
          fontFamily: "Times New Roman",
          cursor: "pointer",
          boxSizing: "border-box",
          transition: "background 0.12s",
          position: "relative",
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(pub);
          }}
          style={{
            position: "absolute",
            top: "12px",
            right: "14px",
            width: "18px",
            height: "18px",
            borderRadius: "4px",
            border: isSelected ? "2px solid #5b58c0" : "1.5px solid #aaa",
            background: isSelected ? "#5b58c0" : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            zIndex: 2,
          }}
        >
          {isSelected && (
            <span style={{ color: "#fff", fontSize: "11px", lineHeight: 1 }}>
              ✓
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0, paddingRight: "28px" }}>
            <p
              style={{
                fontSize: "15px",
                fontWeight: "500",
                margin: "0 0 4px",
                lineHeight: "1.4",
                color: "#1a1a1a",
              }}
            >
              {pub.title}
            </p>

            {pub.authors?.length > 0 && (
              <p style={{ fontSize: "13px", color: "#666", margin: "0 0 8px" }}>
                {pub.authors.slice(0, 3).join(", ")}
                {pub.authors.length > 3 && ` ir dar ${pub.authors.length - 3}`}
              </p>
            )}

            {pub.abstract && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#777",
                  margin: "0 0 12px",
                  lineHeight: "1.5",
                }}
              >
                {pub.abstract.split(" ").slice(0, 30).join(" ")}...
              </p>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {pub.year && (
                <span
                  style={{
                    fontSize: "12px",
                    background: "#f0eef4",
                    color: "#5a5870",
                    padding: "2px 10px",
                    borderRadius: "20px",
                    border: "0.5px solid #d6d3dc",
                  }}
                >
                  {pub.year}
                </span>
              )}
              {pub.doi && (
                <span style={{ fontSize: "12px", color: "#888" }}>
                  DOI:{" "}
                  <a
                    href={pub.doi}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "#4a7cc7" }}
                  >
                    {pub.doi}
                  </a>
                </span>
              )}
              {pub.pdf_url && (
                <a
                  href={pub.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: "12px", color: "#4a7cc7" }}
                >
                  Atidaryti PDF
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {createPortal(
        <PublicationCardModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          pub={pub}
          institutionName={institutionName}
          projects={projects}
        />,
        document.body,
      )}
    </>
  );
}

export default PublicationCard;

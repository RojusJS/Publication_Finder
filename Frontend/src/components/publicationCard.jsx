import { useState, useEffect, useRef } from "react";
import { savePublication } from "../services/projectApi";
import { createPortal } from "react-dom";
import PublicationCardModal from "./publicationCardModal";

function PublicationCard({ pub, projects, institutionName }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#e6e6e6")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        style={{
          background: "#ffffff",
          padding: "16px 20px",
          marginBottom: "10px",
          borderRadius: "12px",
          width: "100%",
          border: "0.5px solid #86848a",
          fontFamily: "Times New Roman",
          cursor: "pointer",
          boxSizing: "border-box",
          transition: "background 0.12s",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
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
                    {pub.doi.length > 40
                      ? pub.doi.slice(0, 40) + "..."
                      : pub.doi}
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

          <div
            ref={dropdownRef}
            style={{ position: "relative", flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              type="button"
              style={{
                padding: "5px 12px",
                fontSize: "13px",
                borderRadius: "8px",
                border: "0.5px solid #c4c2cc",
                background: "#f0eef4",
                color: "#1a1a1a",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Išsaugoti
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "4px",
                  background: "#fff",
                  border: "1px solid #d6d6d6",
                  borderRadius: "10px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  minWidth: "140px",
                  overflow: "hidden",
                  zIndex: 1000,
                }}
              >
                {projects.length === 0 ? (
                  <div
                    style={{
                      padding: "10px 16px",
                      fontFamily: "Times New Roman",
                      color: "#888",
                    }}
                  >
                    Nėra projektų
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={async () => {
                        try {
                          await savePublication(project.id, {
                            openalex_id: pub.openalex_id,
                            title: pub.title,
                            year: pub.year,
                            doi: pub.doi,
                            pdf_url: pub.pdf_url,
                          });
                          alert("Išsaugota");
                        } catch (err) {
                          alert("Nepavyko išsaugoti");
                        }
                        setDropdownOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "15px",
                        color: "#000000",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f0eef4")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      {project.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {createPortal(
        <PublicationCardModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          pub={pub}
          institutionName={institutionName}
        />,
        document.body,
      )}
    </>
  );
}

export default PublicationCard;

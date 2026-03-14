import { useState, useEffect, useRef } from "react";
import { savePublication } from "../services/projectApi";
import PublicationCardModal from "./publicationCardModal";

function PublicationCard({ pub, projects }) {
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
        onMouseEnter={(e) => (e.currentTarget.style.background = "#dfdfdf")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        style={{
          background: "#ffffff",
          padding: "15px",
          marginBottom: "15px",
          borderRadius: "8px",
          width: "100%",
          border: "3px solid #514f58",
          fontFamily: "Times New Roman",
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          cursor: "pointer",
          boxSizing: "border-box",
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
          <div
            ref={dropdownRef}
            style={{ position: "relative", flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              type="button"
              style={{
                padding: "4px 10px",
                background: "#d4d4d4",
                cursor: "pointer",
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
                        (e.currentTarget.style.background = "#c9c9c9")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#ffffff")
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

        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span>Išleidimo metai: {pub.year ?? "—"}</span>
          {pub.authors?.length > 0 && (
            <span style={{ color: "#555", fontSize: "14px" }}>
              {pub.authors.slice(0, 3).join(", ")}
              {pub.authors.length > 3 && ` ir dar ${pub.authors.length - 3}`}
            </span>
          )}
          {pub.doi && (
            <span>
              DOI:{" "}
              <a
                href={pub.doi}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
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
            >
              Atidaryti PDF
            </a>
          )}
        </div>
      </div>

      <PublicationCardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pub={pub}
      />
    </>
  );
}

export default PublicationCard;

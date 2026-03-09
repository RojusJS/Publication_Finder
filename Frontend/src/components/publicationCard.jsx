import { useState, useEffect, useRef } from "react";

function PublicationCard({ pub, projects }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    <div
      style={{
        background: "#ffffff",
        padding: "15px",
        marginBottom: "15px",
        borderRadius: "8px",
        width: "100%",
        border: "3px solid #514f58",
        fontFamily: "Times New Roman",
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
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
        <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
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
                    onClick={() => {
                      console.log("Save to project:", project.id, pub);
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
                      (e.target.style.background = "#e2dcdc")
                    }
                    onMouseLeave={(e) => (e.target.style.background = "none")}
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

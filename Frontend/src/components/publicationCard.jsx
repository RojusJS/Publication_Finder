import { useState } from "react";
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
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#7fa8d4";
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(30,45,74,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isSelected
            ? "#7fa8d4"
            : "#dce3ed";
          e.currentTarget.style.boxShadow = isSelected
            ? "0 0 0 2px rgba(127,168,212,0.2)"
            : "none";
        }}
        style={{
          background: isSelected ? "#f0f6ff" : "#ffffff",
          padding: "16px 18px",
          marginBottom: "8px",
          borderRadius: "10px",
          width: "100%",
          border: isSelected ? "1.5px solid #7fa8d4" : "1px solid #dce3ed",
          boxShadow: isSelected ? "0 0 0 2px rgba(127,168,212,0.2)" : "none",
          fontFamily: "Times New Roman",
          cursor: "pointer",
          boxSizing: "border-box",
          transition: "border-color 0.15s, box-shadow 0.15s",
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
            top: "14px",
            right: "14px",
            width: "17px",
            height: "17px",
            borderRadius: "4px",
            border: isSelected ? "2px solid #1e2d4a" : "1.5px solid #c8d4e3",
            background: isSelected ? "#1e2d4a" : "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            zIndex: 2,
            transition: "all 0.15s",
          }}
        >
          {isSelected && (
            <span style={{ color: "#ffffff", fontSize: "10px", lineHeight: 1 }}>
              ✓
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: "28px" }}>
          <p
            style={{
              fontSize: "14px",
              fontWeight: "600",
              margin: "0 0 5px",
              lineHeight: "1.45",
              color: "#1e2d4a",
            }}
          >
            {pub.title}
          </p>

          {pub.authors?.length > 0 && (
            <p
              style={{
                fontSize: "12px",
                color: "#5a7090",
                margin: "0 0 8px",
                fontFamily: "Times New Roman",
              }}
            >
              {pub.authors.slice(0, 3).join(", ")}
              {pub.authors.length > 3 && ` +${pub.authors.length - 3}`}
            </p>
          )}

          {pub.abstract && (
            <p
              style={{
                fontSize: "12px",
                color: "#7a90aa",
                margin: "0 0 10px",
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
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {pub.year && (
              <span
                style={{
                  fontSize: "11px",
                  background: "#eef1f6",
                  color: "#1e2d4a",
                  padding: "2px 9px",
                  borderRadius: "20px",
                  border: "1px solid #dce3ed",
                  fontWeight: "600",
                  letterSpacing: "0.02em",
                }}
              >
                {pub.year}
              </span>
            )}
            {pub.is_oa && (
              <span
                style={{
                  fontSize: "11px",
                  background: "#e8f4ee",
                  color: "#2a7050",
                  padding: "2px 9px",
                  borderRadius: "20px",
                  border: "1px solid #b8dfc8",
                  fontWeight: "600",
                }}
              >
                Atviroji prieiga
              </span>
            )}
            {pub.doi && (
              <span style={{ fontSize: "12px", color: "#7a90aa" }}>
                DOI:{" "}
                <a
                  href={pub.doi}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "#2a5db0" }}
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
                style={{ fontSize: "12px", color: "#2a5db0" }}
              >
                PDF ↗
              </a>
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
          projects={projects}
        />,
        document.body,
      )}
    </>
  );
}

export default PublicationCard;

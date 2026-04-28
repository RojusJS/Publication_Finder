import { useState } from "react";
import AuthorModal from "./AuthorModal";

function AuthorCard({ author, projects }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        style={{
          background: "#ffffff",
          padding: "16px 18px",
          marginBottom: "8px",
          borderRadius: "10px",
          width: "100%",
          border: "1px solid #dce3ed",
          fontFamily: "Times New Roman",
          cursor: "pointer",
          boxSizing: "border-box",
          transition: "border-color 0.15s, box-shadow 0.15s",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#7fa8d4";
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(30,45,74,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#dce3ed";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "#eef1f6",
              border: "1px solid #dce3ed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: "700",
              color: "#1e2d4a",
              flexShrink: 0,
              fontFamily: "Times New Roman",
            }}
          >
            {(author.display_name || "?").charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: "0 0 3px",
                fontSize: "15px",
                fontWeight: "600",
                color: "#1e2d4a",
                lineHeight: "1.3",
              }}
            >
              {author.display_name}
            </p>
            {author.hint && (
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "12px",
                  color: "#7a90aa",
                }}
              >
                {author.hint}
              </p>
            )}
            {author.institutions?.length > 0 && (
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "12px",
                  color: "#5a7090",
                }}
              >
                {author.institutions.slice(0, 2).join(" · ")}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  background: "#eef1f6",
                  color: "#1e2d4a",
                  padding: "2px 9px",
                  borderRadius: "20px",
                  border: "1px solid #dce3ed",
                  fontWeight: "600",
                }}
              >
                {author.works_count} publikacijos
              </span>
              <span
                style={{
                  fontSize: "11px",
                  background: "#eef1f6",
                  color: "#1e2d4a",
                  padding: "2px 9px",
                  borderRadius: "20px",
                  border: "1px solid #dce3ed",
                  fontWeight: "600",
                }}
              >
                {author.cited_by_count?.toLocaleString()} citavimai
              </span>
              {author.concepts?.slice(0, 3).map((c) => (
                <span
                  key={c}
                  style={{
                    fontSize: "11px",
                    background: "#f7f9fc",
                    color: "#5a7090",
                    padding: "2px 9px",
                    borderRadius: "20px",
                    border: "1px solid #dce3ed",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AuthorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        authorId={author.id}
        projects={projects}
      />
    </>
  );
}

export default AuthorCard;

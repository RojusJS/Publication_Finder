import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Modal from "./modal";
import PublicationCard from "./publicationCard";
import { getAuthorDetail } from "../services/openalexApi";
import { useToast } from "./toastContext";

function StatBadge({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px 18px",
        background: "#eef1f6",
        borderRadius: "8px",
        border: "1px solid #dce3ed",
        minWidth: "90px",
      }}
    >
      <span
        style={{
          fontSize: "18px",
          fontWeight: "700",
          color: "#1e2d4a",
          fontFamily: "Times New Roman",
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontWeight: "700",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#7a90aa",
          marginTop: "2px",
          fontFamily: "Times New Roman",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function AuthorModal({ open, onClose, authorId, projects = [] }) {
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPubs, setSelectedPubs] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open || !authorId) return;
    setAuthor(null);
    setSelectedPubs([]);
    setLoading(true);
    getAuthorDetail(authorId)
      .then(setAuthor)
      .catch(() => showToast("Nepavyko gauti autoriaus informacijos"))
      .finally(() => setLoading(false));
  }, [open, authorId]);

  const handleToggleSelect = (pub) => {
    setSelectedPubs((prev) =>
      prev.find((p) => p.openalex_id === pub.openalex_id)
        ? prev.filter((p) => p.openalex_id !== pub.openalex_id)
        : [...prev, pub],
    );
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={author?.display_name ?? "Autorius"}
      maxWidth="900px"
    >
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "200px",
            color: "#7a90aa",
            fontFamily: "Times New Roman",
            fontSize: "14px",
          }}
        >
          Kraunama...
        </div>
      )}

      {!loading && author && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {author.hint && (
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "#7a90aa",
                fontFamily: "Times New Roman",
              }}
            >
              {author.hint}
            </p>
          )}

          {author.institutions?.length > 0 && (
            <div>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                }}
              >
                Institucijos
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#1e2d4a",
                  fontFamily: "Times New Roman",
                }}
              >
                {author.institutions.join(" · ")}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <StatBadge label="Publikacijos" value={author.works_count} />
            <StatBadge label="Citavimai" value={author.cited_by_count} />
          </div>

          {author.concepts?.length > 0 && (
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                }}
              >
                Tyrimų sritys
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {author.concepts.map((c) => (
                  <span
                    key={c.name}
                    style={{
                      padding: "3px 10px",
                      borderRadius: "20px",
                      background: "#eef1f6",
                      border: "1px solid #dce3ed",
                      fontSize: "12px",
                      color: "#1e2d4a",
                      fontFamily: "Times New Roman",
                    }}
                  >
                    {c.name}
                    {c.score > 0 && (
                      <span
                        style={{
                          color: "#7a90aa",
                          marginLeft: "4px",
                          fontSize: "10px",
                        }}
                      >
                        {c.score}%
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {author.counts_by_year?.length > 0 && (
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                }}
              >
                Aktyvumas (paskutiniai metai)
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[...author.counts_by_year].reverse().map((y) => (
                  <div
                    key={y.year}
                    style={{ textAlign: "center", minWidth: "50px" }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#1e2d4a",
                        fontFamily: "Times New Roman",
                      }}
                    >
                      {y.works_count}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#7a90aa",
                        fontFamily: "Times New Roman",
                      }}
                    >
                      {y.year}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {author.publications?.length > 0 && (
            <div>
              <div
                style={{
                  height: "1px",
                  background: "#eef1f6",
                  marginBottom: "16px",
                }}
              />
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                }}
              >
                Publikacijos ({author.publications.length})
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "0" }}
              >
                {author.publications.map((pub, i) => (
                  <PublicationCard
                    key={pub.openalex_id ?? i}
                    pub={pub}
                    projects={projects}
                    institutionName={null}
                    isSelected={selectedPubs.some(
                      (p) => p.openalex_id === pub.openalex_id,
                    )}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {!author.publications?.length && (
            <p
              style={{
                color: "#7a90aa",
                fontSize: "13px",
                fontFamily: "Times New Roman",
              }}
            >
              Publikacijų nerasta
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

export default AuthorModal;

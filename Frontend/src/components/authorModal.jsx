import { useState, useEffect } from "react";
import Modal from "./modal";
import PublicationCard from "./publicationCard";
import { getAuthorDetail } from "../services/openalexApi";
import { useToast } from "./toastContext";

const PUBS_PER_PAGE = 10;

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
  const [pubPage, setPubPage] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open || !authorId) return;
    setAuthor(null);
    setSelectedPubs([]);
    setPubPage(1);
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

  const pubs = author?.publications || [];
  const totalPubPages = Math.ceil(pubs.length / PUBS_PER_PAGE);
  const pagedPubs = pubs.slice(
    (pubPage - 1) * PUBS_PER_PAGE,
    pubPage * PUBS_PER_PAGE,
  );

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
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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

          {author.orcid && (
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                }}
              >
                ORCID{" "}
              </span>
              <a
                href={author.orcid}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "13px",
                  color: "#2a5db0",
                  fontFamily: "Times New Roman",
                }}
              >
                {author.orcid}
              </a>
            </div>
          )}

          {author.institutions?.length > 0 && (
            <div>
              <p
                style={{
                  margin: "0 0 5px",
                  fontSize: "11px",
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
                  fontSize: "11px",
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

          {pubs.length > 0 && (
            <div>
              <div
                style={{
                  height: "1px",
                  background: "#eef1f6",
                  marginBottom: "14px",
                }}
              />
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                }}
              >
                Publikacijos ({pubs.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {pagedPubs.map((pub, i) => (
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
              {totalPubPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    justifyContent: "center",
                    padding: "14px 0 0",
                    flexWrap: "wrap",
                  }}
                >
                  {Array.from({ length: totalPubPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPubPage(p)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "7px",
                          border:
                            p === pubPage
                              ? "2px solid #1e2d4a"
                              : "1px solid #dce3ed",
                          background: p === pubPage ? "#1e2d4a" : "#ffffff",
                          color: p === pubPage ? "#ffffff" : "#5a7090",
                          cursor: "pointer",
                          fontFamily: "Times New Roman",
                          fontSize: "13px",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {pubs.length === 0 && (
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

import Modal from "./modal";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PublicationCardModal from "./publicationCardModal";
import { getPublicationDetail } from "../services/openalexApi";
import {
  getPublications,
  deletePublication,
  deleteProject,
  getRecommendations,
} from "../services/projectApi";

function SavedPublicationsModal({
  open,
  project,
  onClose,
  onProjectDeleted,
  projects,
  institutionName,
}) {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPub, setSelectedPub] = useState(null);

  const handleDelete = async (pubId) => {
    try {
      await deletePublication(project.id, pubId);
      setPublications((prev) => prev.filter((p) => p.id !== pubId));
    } catch (err) {
      alert("Nepavyko ištrinti");
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Ar tikrai norite ištrinti projektą "${project.name}"?`))
      return;
    try {
      await deleteProject(project.id);
      onProjectDeleted(project.id);
      onClose();
    } catch (err) {
      alert("Nepavyko ištrinti projekto");
    }
  };

  const handleGetRecommendations = async () => {
    setRecLoading(true);
    try {
      const data = await getRecommendations(project.id);
      setRecommendations(data.recommendations);
    } catch (err) {
      alert("Nepavyko gauti rekomendacijų");
    } finally {
      setRecLoading(false);
    }
  };

  const handleOpenSavedPublication = async (pub) => {
  try {
    if (pub.openalex_id) {
      const fullPub = await getPublicationDetail(pub.openalex_id);
      setSelectedPub(fullPub);
    } else {
      setSelectedPub(pub);
    }

    setModalOpen(true);
  } catch (err) {
    alert("Nepavyko gauti publikacijos informacijos");
  }
};

  useEffect(() => {
    if (open && project) {
      setLoading(true);
      setRecommendations([]);
      getPublications(project.id)
        .then(setPublications)
        .catch(() => setPublications([]))
        .finally(() => setLoading(false));
    }
  }, [open, project]);

  if (!project) return null;

  return (
    <Modal open={open} title={project.name} onClose={onClose} maxWidth="1400px">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <p style={{ color: "#636262", margin: 0 }}>
          {project.description || "Aprašymo nėra"}
        </p>
        <button
          onClick={handleDeleteProject}
          style={{
            padding: "4px 10px",
            background: "#e92323a2",
            border: "1px solid #000000",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#000000",
            fontFamily: "Times New Roman",
            fontSize: "15px",
          }}
        >
          Ištrinti projektą
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: "0 0 12px 0",
              fontFamily: "Times New Roman",
              fontSize: "17px",
            }}
          >
            Išsaugotos publikacijos: {publications.length}
          </h3>

          {loading && <p style={{ color: "#979696" }}>Kraunama...</p>}

          {!loading && publications.length === 0 && (
            <p style={{ color: "#888787", fontSize: "14px" }}>
              Išsaugotų publikacijų dar nėra
            </p>
          )}

          {!loading && publications.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {publications.map((pub) => (
                <div
                  key={pub.id}
                  onClick={() => handleOpenSavedPublication(pub)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#e6e6e6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#ffffff")
                  }
                  style={{
                    background: "#ffffff",
                    padding: "16px 20px",
                    marginBottom: "2px",
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
                      gap: "10px",
                    }}
                  >
                    <strong style={{ fontSize: "15px", lineHeight: "1.4" }}>
                      {pub.title}
                    </strong>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(pub.id);
                      }}
                      style={{
                        padding: "3px 8px",
                        background: "#a1a1a1a2",
                        border: "1px solid #000000",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "13px",
                        flexShrink: 0,
                      }}
                    >
                      Ištrinti
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "13px",
                      color: "#5e5b5b",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
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
              ))}
            </div>
          )}

          {!loading && publications.length > 0 && (
            <button
              onClick={handleGetRecommendations}
              disabled={recLoading}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "10px",
                background: recLoading ? "#c0bfbf" : "#1a1a1a",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                cursor: recLoading ? "not-allowed" : "pointer",
                fontFamily: "Times New Roman",
                fontSize: "16px",
              }}
            >
              {recLoading ? "Ieškoma..." : "Gauti rekomendacijas"}
            </button>
          )}
        </div>

        <div
          style={{
            width: "2px",
            background: "#d0cece",
            alignSelf: "stretch",
            borderRadius: "2px",
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: "0 0 12px 0",
              fontFamily: "Times New Roman",
              fontSize: "17px",
            }}
          >
            Rekomenduojamos publikacijos
          </h3>

          {!recLoading && recommendations.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "300px",
                color: "#aaa",
                fontFamily: "Times New Roman",
                fontSize: "15px",
                textAlign: "center",
                border: "2px dashed #d0cece",
                borderRadius: "10px",
              }}
            >
              Placeholder
            </div>
          )}

          {recLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "300px",
                color: "#888",
                fontFamily: "Times New Roman",
                fontSize: "15px",
              }}
            >
              Loading...
            </div>
          )}

          {!recLoading && recommendations.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {recommendations.map((rec, i) => (
                <div
                  key={rec.openalex_id ?? i}
                  onClick={() => handleOpenSavedPublication(rec)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#e6e6e6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f3f4ff")
                  }
                  style={{
                    background: "#f3f4ff",
                    padding: "16px 20px",
                    marginBottom: "2px",
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
                      gap: "10px",
                    }}
                  >
                    <strong style={{ fontSize: "15px", lineHeight: "1.4" }}>
                      {rec.title}
                    </strong>
                    <button
                      style={{
                        padding: "3px 8px",
                        background: "#d4d4d4",
                        border: "1px solid #000000",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "13px",
                        flexShrink: 0,
                      }}
                    >
                      Išsaugoti
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "13px",
                      color: "#5e5b5b",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    <span>Metai: {rec.year ?? "—"}</span>
                    {rec.authors?.length > 0 && (
                      <span>
                        {rec.authors.slice(0, 3).join(", ")}
                        {rec.authors.length > 3 &&
                          ` ir dar ${rec.authors.length - 3}`}
                      </span>
                    )}
                    {rec.doi && (
                      <span>
                        DOI:{" "}
                        <a href={rec.doi} target="_blank" rel="noreferrer">
                          {rec.doi}
                        </a>
                      </span>
                    )}
                    {rec.pdf_url && (
                      <a href={rec.pdf_url} target="_blank" rel="noreferrer">
                        Atidaryti PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {createPortal(
        <PublicationCardModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          pub={selectedPub}
          institutionName={institutionName}
          projects={projects}
        />,
        document.body,
      )}
    </Modal>
  );
}

export default SavedPublicationsModal;

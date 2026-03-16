import Modal from "./modal";
import { useState, useEffect } from "react";
import {getPublications, deletePublication, deleteProject} from "../services/projectApi";

function SavedPublicationsModal({ open, project, onClose, onProjectDeleted }) {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (open && project) {
      setLoading(true);
      getPublications(project.id)
        .then(setPublications)
        .catch(() => setPublications([]))
        .finally(() => setLoading(false));
    }
  }, [open, project]);

  if (!project) return null;

  return (
    <Modal open={open} title={project.name} onClose={onClose} maxWidth="1200px">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 0,
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

      {loading && <p style={{ color: "#979696" }}>Kraunama...</p>}

      {!loading && publications.length === 0 && (
        <p style={{ color: "#888787", fontSize: "14px" }}>
          Išsaugotų publikacijų dar nėra
        </p>
      )}

      {!loading && publications.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginTop: "10px",
          }}
        >
          {publications.map((pub) => (
            <div
              key={pub.id}
              style={{
                border: "2px solid #55535c",
                borderRadius: "8px",
                padding: "12px",
                background: "#f0eeee",
                fontFamily: "Times New Roman",
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
                <strong>{pub.title}</strong>
                <button
                  onClick={() => handleDelete(pub.id)}
                  style={{
                    padding: "4px 10px",
                    background: "#d4d4d4",
                    cursor: "pointer",
                  }}
                >
                  Ištrinti
                </button>
              </div>
              <div
                style={{
                  marginTop: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontSize: "14px",
                  color: "#5e5b5b",
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
    </Modal>
  );
}

export default SavedPublicationsModal;

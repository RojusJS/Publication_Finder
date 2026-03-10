import Modal from "./modal";
import { useState, useEffect } from "react";
import { getPublications } from "../services/projectApi";

function SavedPublicationsModal({ open, project, onClose }) {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(false);

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
      <p style={{ color: "#636262", marginTop: 0 }}>
        {project.description || "Aprašymo nėra"}
      </p>

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
              <strong>{pub.title}</strong>
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

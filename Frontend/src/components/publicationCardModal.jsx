import React from "react";
import Modal from "./modal";
import CitationGraphModal from "./citationGraphModal";
import { savePublication, getFolders } from "../services/projectApi";

function InstitutionsList({ institutions, highlightName }) {
  const [expanded, setExpanded] = React.useState(false);
  const PREVIEW_COUNT = 3;

  const sorted = highlightName
    ? [
        ...institutions.filter((i) =>
          i.toLowerCase().includes(highlightName.toLowerCase()),
        ),
        ...institutions.filter(
          (i) => !i.toLowerCase().includes(highlightName.toLowerCase()),
        ),
      ]
    : institutions;

  const visible = expanded ? sorted : sorted.slice(0, PREVIEW_COUNT);

  return (
    <div>
      <strong>Institucijos:</strong>{" "}
      <span>
        {visible.join(", ")}
        {!expanded && sorted.length > PREVIEW_COUNT && (
          <>
            {" "}
            <button
              onClick={() => setExpanded(true)}
              style={{
                background: "none",
                border: "none",
                color: "#514f58",
                cursor: "pointer",
                padding: 0,
                fontFamily: "Times New Roman",
                fontSize: "15px",
                textDecoration: "underline",
              }}
            >
              rodyti dar {sorted.length - PREVIEW_COUNT} ...
            </button>
          </>
        )}
        {expanded && sorted.length > PREVIEW_COUNT && (
          <>
            {" "}
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: "none",
                border: "none",
                color: "#514f58",
                cursor: "pointer",
                padding: 0,
                fontFamily: "Times New Roman",
                fontSize: "15px",
                textDecoration: "underline",
              }}
            >
              rodyti mažiau
            </button>
          </>
        )}
      </span>
    </div>
  );
}

function PublicationCardModal({
  open,
  onClose,
  pub,
  institutionName,
  projects = [],
}) {
  const [graphOpen, setGraphOpen] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState(null);
  const [folders, setFolders] = React.useState([]);
  const [foldersLoading, setFoldersLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setGraphOpen(false);
      setSaveOpen(false);
      setSelectedProject(null);
      setFolders([]);
    }
  }, [open]);

  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setFolders([]);
    setFoldersLoading(true);
    try {
      const data = await getFolders(project.id);
      setFolders(data);
    } catch {
      alert("Nepavyko gauti aplankų");
    } finally {
      setFoldersLoading(false);
    }
  };

  const handleSaveToFolder = async (folderId) => {
    try {
      setSaving(true);
      await savePublication(selectedProject.id, folderId, {
        openalex_id: pub.openalex_id,
        title: pub.title,
        year: pub.year,
        doi: pub.doi,
        pdf_url: pub.pdf_url,
      });
      alert("Išsaugota");
      setSaveOpen(false);
      setSelectedProject(null);
      setFolders([]);
    } catch {
      alert("Nepavyko išsaugoti");
    } finally {
      setSaving(false);
    }
  };

  if (!pub) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={pub.title} maxWidth="1600px">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontSize: "15px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setGraphOpen(true)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1px solid #7f7a88",
                background: "#000000",
                cursor: "pointer",
                fontFamily: "Times New Roman",
                fontSize: "15px",
                color: "#ffffff"
              }}
            >
              Rodyti citavimo grafą
            </button>

            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setSaveOpen((p) => !p);
                  setSelectedProject(null);
                  setFolders([]);
                }}
                disabled={saving}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: "1px solid #7f7a88",
                  background: "#000000",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "15px",
                  opacity: saving ? 0.7 : 1,
                  color: "#fff"
                }}
              >
                {saving ? "Saugoma..." : "Išsaugoti į projektą"}
              </button>

              {saveOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    background: "#fff",
                    border: "1px solid #d6d6d6",
                    borderRadius: "10px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                    minWidth: "220px",
                    zIndex: 20,
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
                      <div
                        key={project.id}
                        onMouseEnter={() => handleSelectProject(project)}
                        style={{ position: "relative" }}
                      >
                        <div
                          style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            fontFamily: "Times New Roman",
                            fontSize: "15px",
                            color: "#000",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background:
                              selectedProject?.id === project.id
                                ? "#f0eef4"
                                : "none",
                          }}
                        >
                          {project.name}
                          <span style={{ color: "#aaa", fontSize: "12px" }}>
                            ▸
                          </span>
                        </div>

                        {selectedProject?.id === project.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: "calc(100% + 4px)",
                              background: "#fff",
                              border: "1px solid #d6d6d6",
                              borderRadius: "10px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                              minWidth: "200px",
                              zIndex: 21,
                              overflow: "hidden",
                            }}
                          >
                            {foldersLoading ? (
                              <div
                                style={{
                                  padding: "10px 16px",
                                  fontFamily: "Times New Roman",
                                  color: "#888",
                                  fontSize: "14px",
                                }}
                              ></div>
                            ) : folders.length === 0 ? (
                              <div
                                style={{
                                  padding: "10px 16px",
                                  fontFamily: "Times New Roman",
                                  color: "#888",
                                  fontSize: "14px",
                                }}
                              >
                                Aplankų nėra
                              </div>
                            ) : (
                              folders.map((folder) => (
                                <button
                                  key={folder.id}
                                  onClick={() => handleSaveToFolder(folder.id)}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "#f0eef4")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "none")
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "10px 16px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    fontFamily: "Times New Roman",
                                    fontSize: "14px",
                                    color: "#000",
                                    boxSizing: "border-box",
                                  }}
                                >
                                  {folder.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          {pub.authors?.length > 0 && (
            <div>
              <strong>Autoriai:</strong> {pub.authors.join(", ")}
            </div>
          )}
          {pub.institutions?.length > 0 && (
            <InstitutionsList
              institutions={pub.institutions}
              highlightName={institutionName}
            />
          )}
          {pub.source_name && (
            <div>
              <strong>Šaltinis:</strong> {pub.source_name}
            </div>
          )}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {pub.year && (
              <div>
                <strong>Išleidimo metai:</strong> {pub.year}
              </div>
            )}
            {pub.type && (
              <div>
                <strong>Tipas:</strong> {pub.type}
              </div>
            )}
            {pub.language && (
              <div>
                <strong>Kalba:</strong> {pub.language.toUpperCase()}
              </div>
            )}
            {pub.cited_by_count != null && (
              <div>
                <strong>Citavimai:</strong> {pub.cited_by_count}
              </div>
            )}
            {pub.is_oa != null && (
              <div>
                <strong>Atvira prieiga:</strong> {pub.is_oa ? "Taip" : "Ne"}
              </div>
            )}
          </div>
          {pub.keywords?.length > 0 && (
            <div>
              <strong>Raktažodžiai:</strong>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "6px",
                }}
              >
                {pub.keywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      padding: "2px 10px",
                      borderRadius: "20px",
                      background: "#ffffff",
                      border: "2px solid #000000",
                      fontSize: "13px",
                      color: "#000000"
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          {pub.abstract && (
            <div>
              <strong>Santrauka:</strong>
              <p
                style={{
                  marginTop: "6px",
                  marginBottom: 0,
                  lineHeight: "1.6",
                  color: "#333",
                }}
              >
                {pub.abstract}
              </p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {pub.doi && (
              <span>
                <strong>DOI:</strong>{" "}
                <a href={pub.doi} target="_blank" rel="noreferrer">
                  {pub.doi}
                </a>
              </span>
            )}
            {pub.landing_page_url && (
              <a href={pub.landing_page_url} target="_blank" rel="noreferrer">
                Atidaryti publikacijos puslapį
              </a>
            )}
            {pub.pdf_url && (
              <a href={pub.pdf_url} target="_blank" rel="noreferrer">
                Atidaryti PDF
              </a>
            )}
          </div>
        </div>
      </Modal>

      <CitationGraphModal
        open={graphOpen}
        onClose={() => setGraphOpen(false)}
        pub={pub}
        projects={projects}
      />
    </>
  );
}

export default PublicationCardModal;

import Modal from "./modal";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PublicationCardModal from "./publicationCardModal";
import { getPublicationDetail } from "../services/openalexApi";
import { useLanguage } from "./language";
import {
  getFolders,
  createFolder,
  deleteFolder,
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
  const [folders, setFolders] = useState([]);
  const [folderPubs, setFolderPubs] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPub, setSelectedPub] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (open && project) {
      setLoadingFolders(true);
      setRecommendations([]);
      setExpandedFolders({});
      setFolderPubs({});
      getFolders(project.id)
        .then(setFolders)
        .catch(() => setFolders([]))
        .finally(() => setLoadingFolders(false));
    }
  }, [open, project]);

  const handleToggleFolder = async (folderId) => {
    const isOpen = expandedFolders[folderId];
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !isOpen }));
    if (!isOpen && !folderPubs[folderId]) {
      try {
        const pubs = await getPublications(project.id, folderId);
        setFolderPubs((prev) => ({ ...prev, [folderId]: pubs }));
      } catch {
        setFolderPubs((prev) => ({ ...prev, [folderId]: [] }));
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const folder = await createFolder(project.id, {
        name: newFolderName.trim(),
      });
      setFolders((prev) => [...prev, folder]);
      setNewFolderName("");
      setShowNewFolderInput(false);
    } catch {
      alert("Nepavyko sukurti aplanko");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (
      !confirm(
        `${t.delete_confirm_folder} "${folderName}"? ${t.delete_confirm_folder_note}`,
      )
    )
      return;
    try {
      await deleteFolder(project.id, folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setFolderPubs((prev) => {
        const next = { ...prev };
        delete next[folderId];
        return next;
      });
      setExpandedFolders((prev) => {
        const next = { ...prev };
        delete next[folderId];
        return next;
      });
    } catch {
      alert("Nepavyko ištrinti aplanko");
    }
  };

  const handleDeletePublication = async (folderId, pubId) => {
    try {
      await deletePublication(project.id, folderId, pubId);
      setFolderPubs((prev) => ({
        ...prev,
        [folderId]: prev[folderId].filter((p) => p.id !== pubId),
      }));
    } catch {
      alert("Nepavyko ištrinti publikacijos");
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`${t.delete_confirm_project} "${project.name}"?`))
      return;
    try {
      await deleteProject(project.id);
      onProjectDeleted(project.id);
      onClose();
    } catch {
      alert("Nepavyko ištrinti projekto");
    }
  };

  const handleGetRecommendations = async () => {
    setRecLoading(true);
    try {
      const data = await getRecommendations(project.id);
      setRecommendations(data.recommendations);
    } catch {
      alert("Nepavyko gauti rekomendacijų");
    } finally {
      setRecLoading(false);
    }
  };

  const handleOpenPublication = async (pub) => {
    try {
      if (pub.openalex_id) {
        const fullPub = await getPublicationDetail(pub.openalex_id);
        setSelectedPub(fullPub);
      } else {
        setSelectedPub(pub);
      }
      setModalOpen(true);
    } catch {
      alert("Nepavyko gauti publikacijos informacijos");
    }
  };

  const totalPubs = Object.values(folderPubs).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

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
          {project.description || t.no_description}
        </p>
        <button
          onClick={handleDeleteProject}
          style={{
            padding: "4px 10px",
            background: "#000000be",
            border: "1px solid #000000",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#ffffff",
            fontFamily: "Times New Roman",
            fontSize: "15px",
          }}
        >
          {t.delete_project}
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: "Times New Roman",
                fontSize: "17px",
              }}
            >
              {t.folders}
            </h3>
            <button
              onClick={() => setShowNewFolderInput((p) => !p)}
              style={{
                padding: "3px 10px",
                background: "#e2e2e2",
                border: "0.5px solid #979797",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "Times New Roman",
                fontSize: "14px",
              }}
            >
              + {t.new_folder}
            </button>
          </div>

          {showNewFolderInput && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                placeholder={t.folder_name_placeholder}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "0.5px solid #979797",
                  fontFamily: "Times New Roman",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                style={{
                  padding: "6px 12px",
                  background: "#1a1a1a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "14px",
                  opacity: creatingFolder || !newFolderName.trim() ? 0.5 : 1,
                }}
              >
                {t.create}
              </button>
            </div>
          )}

          {loadingFolders && <p style={{ color: "#979696" }}>{t.loading}</p>}

          {!loadingFolders && folders.length === 0 && (
            <p style={{ color: "#888787", fontSize: "14px" }}>{t.no_folders}</p>
          )}

          {!loadingFolders &&
            folders.map((folder) => {
              const isOpen = expandedFolders[folder.id];
              const pubs = folderPubs[folder.id];

              return (
                <div key={folder.id} style={{ marginBottom: "8px" }}>
                  <div
                    onClick={() => handleToggleFolder(folder.id)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#ebebeb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "0.5px solid #979797",
                      cursor: "pointer",
                      transition: "background 0.1s",
                      background: "transparent",
                      fontFamily: "Times New Roman",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#666" }}>
                        {isOpen ? "▾" : "▸"}
                      </span>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#2a2535",
                        }}
                      >
                        {folder.name}
                      </span>
                      {pubs && (
                        <span style={{ fontSize: "12px", color: "#9993a8" }}>
                          {pubs.length} pub.
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id, folder.name);
                      }}
                      style={{
                        padding: "2px 8px",
                        background: "none",
                        border: "0.5px solid #ccc",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "12px",
                        color: "#888",
                      }}
                    >
                      {t.delete}
                    </button>
                  </div>

                  {isOpen && (
                    <div
                      style={{
                        marginTop: "6px",
                        marginLeft: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {!pubs && (
                        <p style={{ color: "#979696", fontSize: "13px" }}>
                          {t.loading}
                        </p>
                      )}
                      {pubs && pubs.length === 0 && (
                        <p style={{ color: "#888787", fontSize: "13px" }}>
                          {t.folder_empty}
                        </p>
                      )}
                      {pubs &&
                        pubs.map((pub) => (
                          <div
                            key={pub.id}
                            onClick={() => handleOpenPublication(pub)}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#e6e6e6")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "#ffffff")
                            }
                            style={{
                              background: "#ffffff",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "0.5px solid #86848a",
                              cursor: "pointer",
                              fontFamily: "Times New Roman",
                              transition: "background 0.12s",
                              boxSizing: "border-box",
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
                              <strong
                                style={{ fontSize: "14px", lineHeight: "1.4" }}
                              >
                                {pub.title}
                              </strong>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePublication(folder.id, pub.id);
                                }}
                                style={{
                                  padding: "2px 8px",
                                  background: "#a1a1a1a2",
                                  border: "1px solid #000",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontFamily: "Times New Roman",
                                  fontSize: "12px",
                                  flexShrink: 0,
                                }}
                              >
                                {t.delete}
                              </button>
                            </div>
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "12px",
                                color: "#5e5b5b",
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                              }}
                            >
                              <span>
                                {t.year} {pub.year ?? "—"}
                              </span>
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
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}

          {!loadingFolders && folders.length > 0 && (
            <button
              onClick={handleGetRecommendations}
              disabled={recLoading}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "10px",
                background: recLoading ? "#c0bfbf" : "#1a1a1a",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: recLoading ? "not-allowed" : "pointer",
                fontFamily: "Times New Roman",
                fontSize: "16px",
              }}
            >
              {recLoading ? t.searching : t.get_recommendations}
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
            {t.recommended}
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
              {t.loading}
            </div>
          )}

          {!recLoading && recommendations.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {recommendations.map((rec, i) => (
                <div
                  key={rec.openalex_id ?? i}
                  onClick={() => handleOpenPublication(rec)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#e6e6e6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f3f4ff")
                  }
                  style={{
                    background: "#f3f4ff",
                    padding: "16px 20px",
                    borderRadius: "12px",
                    border: "0.5px solid #86848a",
                    cursor: "pointer",
                    fontFamily: "Times New Roman",
                    transition: "background 0.12s",
                    boxSizing: "border-box",
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
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: "3px 8px",
                        background: "#d4d4d4",
                        border: "1px solid #000",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "13px",
                        flexShrink: 0,
                      }}
                    >
                      {t.save}
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
                        <a
                          href={rec.doi}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {rec.doi}
                        </a>
                      </span>
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

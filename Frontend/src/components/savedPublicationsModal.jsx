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
  getProjectPublications,
  deletePublication,
  deleteProjectPublication,
  deleteProject,
  getRecommendations,
  savePublication,
} from "../services/projectApi";
import { useToast } from "./toastContext";
import jsPDF from "jspdf";

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

  const [selectedRecs, setSelectedRecs] = useState([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [selectedSaveProject, setSelectedSaveProject] = useState(null);
  const [saveFolders, setSaveFolders] = useState([]);
  const [saveFoldersLoading, setSaveFoldersLoading] = useState(false);
  const [savingRecommendations, setSavingRecommendations] = useState(false);
  const [projectPubs, setProjectPubs] = useState([]);

  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (open && project) {
      setLoadingFolders(true);
      setRecommendations([]);
      setExpandedFolders({});
      setFolderPubs({});
      setSelectedRecs([]);
      setSaveOpen(false);
      setSelectedSaveProject(null);
      setSaveFolders([]);
      setProjectPubs([]);
      Promise.all([
        getFolders(project.id).catch(() => []),
        getProjectPublications(project.id).catch(() => []),
      ])
        .then(([foldersData, projectPubsData]) => {
          setFolders(foldersData);
          setProjectPubs(projectPubsData);
        })
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
      showToast("Nepavyko sukurti aplanko");
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
      showToast("Nepavyko ištrinti aplanko");
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
      showToast("Nepavyko ištrinti publikacijos");
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`${t.delete_confirm_project} "${project.name}"?`)) return;
    try {
      await deleteProject(project.id);
      onProjectDeleted(project.id);
      onClose();
    } catch {
      showToast("Nepavyko ištrinti projekto");
    }
  };

  const handleGetRecommendations = async () => {
    setRecLoading(true);
    try {
      const data = await getRecommendations(project.id);
      setRecommendations(data.recommendations || []);
      setSelectedRecs([]);
      setSaveOpen(false);
      setSelectedSaveProject(null);
      setSaveFolders([]);
    } catch {
      showToast("Nepavyko gauti rekomendacijų");
    } finally {
      setRecLoading(false);
    }
  };

  const handleOpenPublication = async (pub) => {
    if (pub.openalex_id && !pub.abstract) {
      try {
        const detail = await getPublicationDetail(pub.openalex_id);
        setSelectedPub({ ...detail, type: detail.type ?? pub.type });
      } catch {
        setSelectedPub({ ...pub, type: pub.pub_type });
      }
    } else {
      setSelectedPub({ ...pub, type: pub.pub_type });
    }
    setModalOpen(true);
  };

  const handleToggleRecommendation = (rec) => {
    setSelectedRecs((prev) =>
      prev.some((p) => p.openalex_id === rec.openalex_id)
        ? prev.filter((p) => p.openalex_id !== rec.openalex_id)
        : [...prev, rec],
    );
  };

  const handleSelectSaveProject = async (projectItem) => {
    if (selectedSaveProject?.id === projectItem.id) return;
    setSelectedSaveProject(projectItem);
    setSaveFolders([]);
    setSaveFoldersLoading(true);
    try {
      const data = await getFolders(projectItem.id);
      setSaveFolders(data);
    } catch {
      showToast("Nepavyko gauti aplankų");
    } finally {
      setSaveFoldersLoading(false);
    }
  };

  const handleSaveSelectedRecommendations = async (folderId) => {
    if (!selectedSaveProject || selectedRecs.length === 0) return;
    setSavingRecommendations(true);
    try {
      await Promise.all(
        selectedRecs.map((rec) =>
          savePublication(selectedSaveProject.id, folderId, rec),
        ),
      );
      showToast(t.saved, "success");
      setSelectedRecs([]);
      setSaveOpen(false);
      setSelectedSaveProject(null);
      setSaveFolders([]);
    } catch {
      showToast("Nepavyko išsaugoti");
    } finally {
      setSavingRecommendations(false);
    }
  };

  const handleExport = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const addText = (text, size, isBold = false, color = [0, 0, 0]) => {
      doc.setFontSize(size);
      doc.setFont("Times New Roman", isBold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text ?? ""), maxWidth);
      lines.forEach((line) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += size * 0.45;
      });
      y += 2;
    };

    addText(project.name, 20, true);
    if (project.description)
      addText(project.description, 11, false, [80, 80, 80]);
    y += 4;

    for (const folder of folders) {
      let pubs = folderPubs[folder.id];
      if (!pubs) {
        try {
          pubs = await getPublications(project.id, folder.id);
        } catch {
          pubs = [];
        }
      }

      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      addText(folder.name, 14, true);

      if (pubs.length === 0) {
        addText("No publications", 10, false, [150, 150, 150]);
      }

      pubs.forEach((pub, i) => {
        if (y > 255) {
          doc.addPage();
          y = 20;
        }
        addText(`${i + 1}. ${pub.title}`, 11, true);
        if (pub.year) addText(`Year: ${pub.year}`, 10);
        if (pub.authors?.length)
          addText(
            `Authors: ${pub.authors.slice(0, 5).join(", ")}${pub.authors.length > 5 ? ` +${pub.authors.length - 5} more` : ""}`,
            10,
          );
        if (pub.source_name) addText(`Source: ${pub.source_name}`, 10);
        if (pub.pub_type) addText(`Type: ${pub.pub_type}`, 10);
        if (pub.language)
          addText(`Language: ${pub.language.toUpperCase()}`, 10);
        if (pub.cited_by_count != null)
          addText(`Citations: ${pub.cited_by_count}`, 10);
        if (pub.is_oa != null)
          addText(`Open access: ${pub.is_oa ? "Yes" : "No"}`, 10);
        if (pub.doi) addText(`DOI: ${pub.doi}`, 10);
        if (pub.keywords?.length)
          addText(`Keywords: ${pub.keywords.join(", ")}`, 10);
        if (pub.abstract) {
          const short =
            pub.abstract.split(" ").slice(0, 60).join(" ") +
            (pub.abstract.split(" ").length > 60 ? "..." : "");
          addText(`Abstract: ${short}`, 9, false, [60, 60, 60]);
        }
        y += 4;
      });

      y += 4;
    }

    doc.save(`${project.name}.pdf`);
  };

  if (!project) return null;

  const renderPublicationCard = (pub, onDelete) => (
    <div
      key={pub.id}
      onClick={() => handleOpenPublication(pub)}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#e6e6e6")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
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
        <strong style={{ fontSize: "14px", lineHeight: "1.4" }}>
          {pub.title}
        </strong>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(pub.id);
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
  );

  const handleDeleteProjectPublication = async (pubId) => {
    try {
      await deleteProjectPublication(project.id, pubId);
      setProjectPubs((prev) => prev.filter((p) => p.id !== pubId));
    } catch {
      showToast("Nepavyko ištrinti publikacijos");
    }
  };

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
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleExport}
            style={{
              padding: "4px 10px",
              background: "#e2e2e2",
              border: "1px solid #000000",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#000000",
              fontFamily: "Times New Roman",
              fontSize: "15px",
            }}
          >
            {t.export}
          </button>
          <button
            onClick={handleDeleteProject}
            style={{
              padding: "4px 10px",
              background: "#000000",
              border: "1px solid #000000",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#ffffff",
              fontFamily: "Times New Roman",
              fontSize: "16px",
            }}
          >
            {t.delete_project}
          </button>
        </div>
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
              {t.new_folder}
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
          {!loadingFolders && projectPubs.length > 0 && (
            <div style={{ marginTop: "18px" }}>
              <h4
                style={{
                  margin: "0 0 10px 0",
                  fontFamily: "Times New Roman",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#2a2535",
                }}
              >
                Publikacijos projekte
              </h4>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {projectPubs.map((pub) =>
                  renderPublicationCard(pub, handleDeleteProjectPublication),
                )}
              </div>
            </div>
          )}

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: "Times New Roman",
                fontSize: "17px",
              }}
            >
              {t.recommended}
            </h3>

            {selectedRecs.length > 0 && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setSaveOpen((p) => !p);
                    setSelectedSaveProject(null);
                    setSaveFolders([]);
                  }}
                  disabled={savingRecommendations}
                  style={{
                    padding: "8px 12px",
                    background: "#1a1a1a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    cursor: savingRecommendations ? "not-allowed" : "pointer",
                    fontFamily: "Times New Roman",
                    fontSize: "15px",
                    opacity: savingRecommendations ? 0.6 : 1,
                  }}
                >
                  {savingRecommendations
                    ? t.saving
                    : `${t.save} (${selectedRecs.length})`}
                </button>

                {saveOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      background: "#fff",
                      border: "1px solid #d6d6d6",
                      borderRadius: "10px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      minWidth: "220px",
                      zIndex: 40,
                    }}
                  >
                    {!selectedSaveProject &&
                      (projects.length === 0 ? (
                        <div
                          style={{
                            padding: "10px 16px",
                            fontFamily: "Times New Roman",
                            color: "#888",
                          }}
                        >
                          {t.no_projects_dropdown}
                        </div>
                      ) : (
                        projects.map((projectItem) => (
                          <div
                            key={projectItem.id}
                            onMouseEnter={() =>
                              handleSelectSaveProject(projectItem)
                            }
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
                                  selectedSaveProject?.id === projectItem.id
                                    ? "#f0eef4"
                                    : "none",
                              }}
                            >
                              {projectItem.name}
                              <span style={{ color: "#aaa", fontSize: "12px" }}>
                                ▸
                              </span>
                            </div>
                          </div>
                        ))
                      ))}

                    {selectedSaveProject && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedSaveProject(null);
                            setSaveFolders([]);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 16px",
                            background: "#f7f7f7",
                            border: "none",
                            borderBottom: "1px solid #eee",
                            textAlign: "left",
                            cursor: "pointer",
                            fontFamily: "Times New Roman",
                            fontSize: "13px",
                            color: "#666",
                          }}
                        >
                          ← {selectedSaveProject.name}
                        </button>

                        {saveFoldersLoading ? (
                          <div
                            style={{
                              padding: "10px 16px",
                              fontFamily: "Times New Roman",
                              color: "#888",
                              fontSize: "14px",
                            }}
                          >
                            {t.loading}
                          </div>
                        ) : saveFolders.length === 0 ? (
                          <div
                            style={{
                              padding: "10px 16px",
                              fontFamily: "Times New Roman",
                              color: "#888",
                              fontSize: "14px",
                            }}
                          >
                            {t.no_folders_dropdown}
                          </div>
                        ) : (
                          saveFolders.map((folder) => (
                            <button
                              key={folder.id}
                              onClick={() =>
                                handleSaveSelectedRecommendations(folder.id)
                              }
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#f0eef4")
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
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
              {recommendations.map((rec, i) => {
                const isSelected = selectedRecs.some(
                  (p) => p.openalex_id === rec.openalex_id,
                );

                return (
                  <div
                    key={rec.openalex_id ?? i}
                    onClick={() => handleOpenPublication(rec)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#e6e6e6")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = isSelected
                        ? "#eef0ff"
                        : "#f3f4ff")
                    }
                    style={{
                      background: isSelected ? "#eef0ff" : "#f3f4ff",
                      padding: "16px 20px",
                      borderRadius: "12px",
                      border: isSelected
                        ? "0.5px solid #7a78c8"
                        : "0.5px solid #86848a",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      transition: "background 0.12s",
                      boxSizing: "border-box",
                      position: "relative",
                    }}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRecommendation(rec);
                      }}
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "14px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "4px",
                        border: isSelected
                          ? "2px solid #5b58c0"
                          : "1.5px solid #aaa",
                        background: isSelected ? "#5b58c0" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        zIndex: 2,
                      }}
                    >
                      {isSelected && (
                        <span
                          style={{
                            color: "#fff",
                            fontSize: "11px",
                            lineHeight: 1,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "15px",
                          lineHeight: "1.4",
                          paddingRight: "28px",
                        }}
                      >
                        {rec.title}
                      </strong>
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
                      <span>
                        {t.year} {rec.year ?? "—"}
                      </span>
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
                      {rec.similarity != null && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "4px",
                            padding: "1px 8px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            background:
                              rec.similarity >= 70
                                ? "#d3ecd9"
                                : rec.similarity >= 40
                                  ? "#f8edc7"
                                  : "#f3d3d6",
                            color:
                              rec.similarity >= 70
                                ? "#2b703c"
                                : rec.similarity >= 40
                                  ? "#836304"
                                  : "#831f28",
                          }}
                        >
                          {rec.similarity}% atitikimas
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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

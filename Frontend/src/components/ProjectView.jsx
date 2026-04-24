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
import LabelBadge from "./labelBadge";
import jsPDF from "jspdf";

function ProjectView({
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
    if (!project) return;
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
  }, [project]);

  if (!project) return null;

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
        setSelectedPub({
          ...detail,
          type: detail.type ?? pub.type,
          id: pub.id,
        });
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

  const handleLabelChange = (pubId, newLabel, context) => {
    if (context === "project") {
      setProjectPubs((prev) =>
        prev.map((p) => (p.id === pubId ? { ...p, label: newLabel } : p)),
      );
    } else {
      setFolderPubs((prev) => ({
        ...prev,
        [context]: prev[context].map((p) =>
          p.id === pubId ? { ...p, label: newLabel } : p,
        ),
      }));
    }
  };

  const handleDeleteProjectPublication = async (pubId) => {
    try {
      await deleteProjectPublication(project.id, pubId);
      setProjectPubs((prev) => prev.filter((p) => p.id !== pubId));
    } catch {
      showToast("Nepavyko ištrinti publikacijos");
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
      if (pubs.length === 0)
        addText("No publications", 10, false, [150, 150, 150]);
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

  const renderPublicationCard = (pub, onDelete, context = "project") => (
    <div
      key={pub.id}
      onClick={() => handleOpenPublication(pub)}
      style={{
        background: "#fff",
        padding: "12px 14px",
        borderRadius: "8px",
        border: "1px solid #d0d0d0",
        cursor: "pointer",
        fontFamily: "Times New Roman",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxSizing: "border-box",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#999999";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)";
        const btn = e.currentTarget.querySelector(".delete-btn");
        if (btn) btn.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#d0d0d0";
        e.currentTarget.style.boxShadow = "none";
        const btn = e.currentTarget.querySelector(".delete-btn");
        if (btn) btn.style.opacity = "0";
      }}
    >
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(pub.id);
        }}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          padding: "2px 8px",
          background: "none",
          border: "1px solid #cccccc",
          borderRadius: "5px",
          cursor: "pointer",
          fontFamily: "Times New Roman",
          fontSize: "11px",
          color: "#999999",
          opacity: 0,
          transition: "opacity 0.15s, color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#c0392b";
          e.currentTarget.style.borderColor = "#c0392b";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#999999";
          e.currentTarget.style.borderColor = "#cccccc";
        }}
      >
        {t.delete}
      </button>

      <p
        style={{
          margin: "0 32px 0 0",
          fontSize: "13px",
          fontWeight: "600",
          lineHeight: "1.45",
          color: "#111",
        }}
      >
        {pub.title}
      </p>
      <div
        style={{
          marginTop: "6px",
          fontSize: "12px",
          color: "#555",
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
              style={{ color: "#2a5db0" }}
            >
              {pub.doi}
            </a>
          </span>
        )}
        <LabelBadge
          pubId={pub.id}
          currentLabel={pub.label}
          onChange={(newLabel) => handleLabelChange(pub.id, newLabel, context)}
        />
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Times New Roman",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
          paddingBottom: "14px",
          borderBottom: "1px solid #d0d0d0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "5px 10px",
              background: "none",
              border: "1px solid #ccc",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "Times New Roman",
              fontSize: "13px",
              color: "#444",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#777")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#ccc")}
          >
            ← {t.back ?? "Back"}
          </button>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "600",
                color: "#111",
                fontFamily: "Times New Roman",
              }}
            >
              {project.name}
            </h2>
            {project.description && (
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "12px",
                  color: "#777",
                  fontFamily: "Times New Roman",
                }}
              >
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleExport}
            style={{
              padding: "6px 14px",
              background: "none",
              border: "1px solid #ccc",
              borderRadius: "6px",
              cursor: "pointer",
              color: "#333",
              fontFamily: "Times New Roman",
              fontSize: "13px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {t.export}
          </button>
          <button
            onClick={handleDeleteProject}
            style={{
              padding: "6px 14px",
              background: "none",
              border: "1px solid #ccc",
              borderRadius: "6px",
              cursor: "pointer",
              color: "#c0392b",
              fontFamily: "Times New Roman",
              fontSize: "13px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fff0ee";
              e.currentTarget.style.borderColor = "#c0392b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.borderColor = "#ccc";
            }}
          >
            {t.delete_project}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div
          style={{
            flex: "0 0 48%",
            overflowY: "auto",
            height: "100%",
            paddingRight: "24px",
            paddingTop: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: "700",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#777",
              }}
            >
              {t.folders}
            </span>
            <button
              onClick={() => setShowNewFolderInput((p) => !p)}
              style={{
                padding: "4px 10px",
                background: "none",
                border: "1px solid #ccc",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "Times New Roman",
                fontSize: "12px",
                color: "#333",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f0f0f0")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
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
                  borderRadius: "6px",
                  border: "1px solid #cccccc",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  outline: "none",
                  color: "#111111",
                }}
              />
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                style={{
                  padding: "6px 14px",
                  background: "#111111",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  opacity: creatingFolder || !newFolderName.trim() ? 0.4 : 1,
                }}
              >
                {t.create}
              </button>
            </div>
          )}

          {loadingFolders && (
            <p style={{ color: "#888888", fontSize: "13px" }}>{t.loading}</p>
          )}
          {!loadingFolders && folders.length === 0 && (
            <p style={{ color: "#999999", fontSize: "13px" }}>{t.no_folders}</p>
          )}

          {!loadingFolders &&
            folders.map((folder) => {
              const isOpen = expandedFolders[folder.id];
              const pubs = folderPubs[folder.id];
              return (
                <div key={folder.id} style={{ marginBottom: "6px" }}>
                  <div
                    onClick={() => handleToggleFolder(folder.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "9px 12px",
                      borderRadius: "7px",
                      background: isOpen ? "#f0f0f0" : "#fafafa",
                      border: "1px solid #d0d0d0",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      transition: "background 0.1s",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#ececec";
                      const btn =
                        e.currentTarget.querySelector(".folder-delete-btn");
                      if (btn) btn.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isOpen
                        ? "#f0f0f0"
                        : "#fafafa";
                      const btn =
                        e.currentTarget.querySelector(".folder-delete-btn");
                      if (btn) btn.style.opacity = "0";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "10px", color: "#777777" }}>
                        {isOpen ? "▾" : "▸"}
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#111111",
                        }}
                      >
                        {folder.name}
                      </span>
                      {pubs && (
                        <span style={{ fontSize: "11px", color: "#888888" }}>
                          {pubs.length}
                        </span>
                      )}
                    </div>
                    <button
                      className="folder-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id, folder.name);
                      }}
                      style={{
                        padding: "2px 7px",
                        background: "none",
                        border: "1px solid #cccccc",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "11px",
                        color: "#999999",
                        opacity: 0,
                        transition:
                          "opacity 0.15s, color 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#c0392b";
                        e.currentTarget.style.borderColor = "#c0392b";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#999999";
                        e.currentTarget.style.borderColor = "#cccccc";
                      }}
                    >
                      {t.delete}
                    </button>
                  </div>

                  {isOpen && (
                    <div
                      style={{
                        marginTop: "4px",
                        marginLeft: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {!pubs && (
                        <p style={{ color: "#888888", fontSize: "12px" }}>
                          {t.loading}
                        </p>
                      )}
                      {pubs && pubs.length === 0 && (
                        <p style={{ color: "#999999", fontSize: "12px" }}>
                          {t.folder_empty}
                        </p>
                      )}
                      {pubs &&
                        pubs.map((pub) =>
                          renderPublicationCard(
                            pub,
                            (id) => handleDeletePublication(folder.id, id),
                            folder.id,
                          ),
                        )}
                    </div>
                  )}
                </div>
              );
            })}

          {!loadingFolders && projectPubs.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#777777",
                }}
              >
                Publikacijos projekte
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginTop: "10px",
                }}
              >
                {projectPubs.map((pub) =>
                  renderPublicationCard(
                    pub,
                    handleDeleteProjectPublication,
                    "project",
                  ),
                )}
              </div>
            </div>
          )}

          {!loadingFolders && folders.length > 0 && (
            <button
              onClick={handleGetRecommendations}
              disabled={recLoading}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "10px",
                background: recLoading ? "#f0f0f0" : "#111111",
                color: recLoading ? "#888888" : "#ffffff",
                border: "1px solid",
                borderColor: recLoading ? "#d0d0d0" : "#111111",
                borderRadius: "8px",
                cursor: recLoading ? "not-allowed" : "pointer",
                fontFamily: "Times New Roman",
                fontSize: "14px",
              }}
            >
              {recLoading ? t.searching : t.get_recommendations}
            </button>
          )}
        </div>

        <div
          style={{
            width: "1px",
            background: "#d0d0d0",
            flexShrink: 0,
            margin: "16px 0 0",
          }}
        />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            height: "100%",
            paddingLeft: "24px",
            paddingTop: "16px",
            background: "#f7f7f7",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: "700",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#777777",
              }}
            >
              {t.recommended}
            </span>

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
                    padding: "6px 12px",
                    background: "#111111",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: savingRecommendations ? "not-allowed" : "pointer",
                    fontFamily: "Times New Roman",
                    fontSize: "13px",
                    opacity: savingRecommendations ? 0.5 : 1,
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
                      background: "#ffffff",
                      border: "1px solid #cccccc",
                      borderRadius: "8px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      minWidth: "200px",
                      zIndex: 40,
                      overflow: "hidden",
                    }}
                  >
                    {!selectedSaveProject &&
                      (projects.length === 0 ? (
                        <div
                          style={{
                            padding: "10px 16px",
                            fontFamily: "Times New Roman",
                            color: "#888888",
                            fontSize: "13px",
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
                                padding: "9px 14px",
                                cursor: "pointer",
                                fontFamily: "Times New Roman",
                                fontSize: "13px",
                                color: "#111111",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                background:
                                  selectedSaveProject?.id === projectItem.id
                                    ? "#f0f0f0"
                                    : "none",
                              }}
                            >
                              {projectItem.name}
                              <span style={{ color: "#bbbbbb", fontSize: "11px" }}>
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
                            padding: "8px 14px",
                            background: "#f5f5f5",
                            border: "none",
                            borderBottom: "1px solid #e0e0e0",
                            textAlign: "left",
                            cursor: "pointer",
                            fontFamily: "Times New Roman",
                            fontSize: "12px",
                            color: "#555555",
                          }}
                        >
                          ← {selectedSaveProject.name}
                        </button>
                        {saveFoldersLoading ? (
                          <div
                            style={{
                              padding: "10px 14px",
                              color: "#888888",
                              fontSize: "13px",
                            }}
                          >
                            {t.loading}
                          </div>
                        ) : saveFolders.length === 0 ? (
                          <div
                            style={{
                              padding: "10px 14px",
                              color: "#888888",
                              fontSize: "13px",
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
                                (e.currentTarget.style.background = "#f0f0f0")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "none")
                              }
                              style={{
                                width: "100%",
                                padding: "9px 14px",
                                background: "none",
                                border: "none",
                                textAlign: "left",
                                cursor: "pointer",
                                fontFamily: "Times New Roman",
                                fontSize: "13px",
                                color: "#111111",
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
                height: "260px",
                color: "#aaaaaa",
                fontFamily: "Times New Roman",
                fontSize: "13px",
                textAlign: "center",
                border: "1px dashed #cccccc",
                borderRadius: "10px",
              }}
            >
              {t.get_recommendations ??
                "Get recommendations to see suggestions"}
            </div>
          )}

          {recLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "260px",
                color: "#888888",
                fontFamily: "Times New Roman",
                fontSize: "13px",
              }}
            >
              {t.loading}
            </div>
          )}

          {!recLoading && recommendations.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {recommendations.map((rec, i) => {
                const isSelected = selectedRecs.some(
                  (p) => p.openalex_id === rec.openalex_id,
                );
                return (
                  <div
                    key={rec.openalex_id ?? i}
                    onClick={() => handleOpenPublication(rec)}
                    style={{
                      background: isSelected ? "#ececec" : "#ffffff",
                      padding: "14px 16px",
                      borderRadius: "8px",
                      border: isSelected
                        ? "1px solid #999999"
                        : "1px solid #d0d0d0",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      boxSizing: "border-box",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#888888";
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(0,0,0,0.07)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isSelected
                        ? "#999999"
                        : "#d0d0d0";
                      e.currentTarget.style.boxShadow = "none";
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
                        right: "12px",
                        width: "16px",
                        height: "16px",
                        borderRadius: "4px",
                        border: isSelected
                          ? "2px solid #111111"
                          : "1.5px solid #bbbbbb",
                        background: isSelected ? "#111111" : "#ffffff",
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
                            color: "#ffffff",
                            fontSize: "10px",
                            lineHeight: 1,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: "0 28px 0 0",
                        fontSize: "13px",
                        fontWeight: "600",
                        lineHeight: "1.45",
                        color: "#111111",
                      }}
                    >
                      {rec.title}
                    </p>

                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#555555",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span>
                        {t.year} {rec.year ?? "—"}
                      </span>
                      {rec.authors?.length > 0 && (
                        <span>
                          {rec.authors.slice(0, 3).join(", ")}
                          {rec.authors.length > 3 &&
                            ` +${rec.authors.length - 3}`}
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
                            style={{ color: "#2a5db0" }}
                          >
                            {rec.doi}
                          </a>
                        </span>
                      )}
                      {rec.similarity != null && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "5px",
                            padding: "2px 8px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontFamily: "sans-serif",
                            background:
                              rec.similarity >= 70
                                ? "#e8f5ec"
                                : rec.similarity >= 40
                                  ? "#fef9e7"
                                  : "#fdecea",
                            color:
                              rec.similarity >= 70
                                ? "#1e6640"
                                : rec.similarity >= 40
                                  ? "#6b5200"
                                  : "#922b21",
                            width: "fit-content",
                            fontWeight: "600",
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
    </div>
  );
}

export default ProjectView;

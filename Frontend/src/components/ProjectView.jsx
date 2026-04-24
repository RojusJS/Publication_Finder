import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PublicationCardModal from "./publicationCardModal";
import { getPublicationDetail } from "../services/openalexApi";
import { useLanguage } from "./language";
import CreateProjectModal from "./projectsModal";
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
  getProjectAnalytics,
  updateProject,
  updateFolder,
} from "../services/projectApi";
import { useToast } from "./toastContext";
import LabelBadge from "./labelBadge";
import jsPDF from "jspdf";

function ProjectView({
  project,
  onClose,
  onProjectDeleted,
  onProjectUpdated,
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
  const [selectedRecommendationFolder, setSelectedRecommendationFolder] =
    useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState(project);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (!project) return;
    setCurrentProject(project);
    setLoadingFolders(true);
    setAnalyticsLoading(true);
    setRecommendations([]);
    setExpandedFolders({});
    setFolderPubs({});
    setSelectedRecs([]);
    setSaveOpen(false);
    setSelectedSaveProject(null);
    setSaveFolders([]);
    setProjectPubs([]);
    setSelectedRecommendationFolder("");
    setAnalytics(null);
    Promise.all([
      getFolders(project.id).catch(() => []),
      getProjectPublications(project.id).catch(() => []),
      getProjectAnalytics(project.id).catch(() => null),
    ])
      .then(([foldersData, projectPubsData, analyticsData]) => {
        setFolders(foldersData);
        setProjectPubs(projectPubsData);
        setAnalytics(analyticsData);
      })
      .finally(() => {
        setLoadingFolders(false);
        setAnalyticsLoading(false);
      });
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
    if (!confirm(`${t.delete_confirm_project} "${currentProject.name}"?`))
      return;
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
      const folderId = selectedRecommendationFolder
        ? Number(selectedRecommendationFolder)
        : null;
      const data = await getRecommendations(project.id, folderId);
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

  const handleUpdateProject = async (data) => {
    try {
      const updated = await updateProject(project.id, data);
      setCurrentProject(updated);
      setEditProjectOpen(false);
      showToast("Projektas atnaujintas", "success");
      if (onProjectUpdated) onProjectUpdated(updated);
    } catch {
      showToast("Nepavyko atnaujinti projekto");
    }
  };

  const startEditFolder = (e, folder) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const cancelEditFolder = () => {
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const handleUpdateFolder = async (folderId) => {
    if (!editingFolderName.trim()) return;
    try {
      const updated = await updateFolder(project.id, folderId, {
        name: editingFolderName.trim(),
      });
      setFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
      setEditingFolderId(null);
      setEditingFolderName("");
      showToast("Aplankas atnaujintas", "success");
    } catch {
      showToast("Nepavyko atnaujinti aplanko");
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
    addText(currentProject.name, 20, true);
    if (currentProject.description)
      addText(currentProject.description, 11, false, [80, 80, 80]);
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
    doc.save(`${currentProject.name}.pdf`);
  };

  const renderPublicationCard = (pub, onDelete, context = "project") => (
    <div
      key={pub.id}
      onClick={() => handleOpenPublication(pub)}
      style={{
        background: "#ffffff",
        padding: "12px 14px",
        borderRadius: "8px",
        border: "1px solid #dce3ed",
        cursor: "pointer",
        fontFamily: "Times New Roman",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxSizing: "border-box",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#7fa8d4";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(30,45,74,0.08)";
        const btn = e.currentTarget.querySelector(".delete-btn");
        if (btn) btn.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#dce3ed";
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
          border: "1px solid #dce3ed",
          borderRadius: "5px",
          cursor: "pointer",
          fontFamily: "Times New Roman",
          fontSize: "11px",
          color: "#7a90aa",
          opacity: 0,
          transition: "opacity 0.15s, color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#c0392b";
          e.currentTarget.style.borderColor = "#c0392b";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#7a90aa";
          e.currentTarget.style.borderColor = "#dce3ed";
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
          color: "#1e2d4a",
        }}
      >
        {pub.title}
      </p>
      <div
        style={{
          marginTop: "6px",
          fontSize: "12px",
          color: "#5a7090",
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

  const navBtn = (danger = false) => ({
    padding: "6px 14px",
    background: "none",
    border: danger
      ? "1px solid rgba(245,160,160,0.35)"
      : "1px solid rgba(255,255,255,0.25)",
    borderRadius: "6px",
    cursor: "pointer",
    color: danger ? "#f5a0a0" : "rgba(255,255,255,0.85)",
    fontFamily: "Times New Roman",
    fontSize: "13px",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Times New Roman",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          background: "#1e2d4a",
          padding: "14px 20px",
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={onClose}
            style={navBtn()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
          >
            ← {t.back ?? "Back"}
          </button>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: "600",
                color: "#ffffff",
                fontFamily: "Times New Roman",
              }}
            >
              {currentProject.name}
            </h2>
            {currentProject.description && (
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "Times New Roman",
                }}
              >
                {currentProject.description}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setEditProjectOpen(true)}
            style={navBtn()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
          >
            Redaguoti
          </button>
          <button
            onClick={handleExport}
            style={navBtn()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
          >
            {t.export}
          </button>
          <button
            onClick={handleDeleteProject}
            style={navBtn(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(192,57,43,0.2)";
              e.currentTarget.style.borderColor = "#f5a0a0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.borderColor = "rgba(245,160,160,0.35)";
            }}
          >
            {t.delete_project}
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#eef1f6",
          borderBottom: "1px solid #dce3ed",
          padding: "8px 20px",
          display: "flex",
          gap: "20px",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {[
          {
            label: "Publikacijos",
            value: analyticsLoading
              ? "..."
              : (analytics?.total_publications ?? 0),
          },
          {
            label: "Vid. metai",
            value: analyticsLoading ? "..." : (analytics?.average_year ?? "—"),
          },
          {
            label: "Citavimai",
            value: analyticsLoading ? "..." : (analytics?.total_citations ?? 0),
          },
          {
            label: "Raktažodžiai",
            value: analyticsLoading
              ? "..."
              : analytics?.top_keywords?.length
                ? analytics.top_keywords.slice(0, 3).join(", ")
                : "—",
          },
        ].map((item) => (
          <span
            key={item.label}
            style={{
              display: "flex",
              gap: "5px",
              alignItems: "center",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                color: "#7a90aa",
                fontWeight: "700",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontSize: "10px",
              }}
            >
              {item.label}
            </span>
            <span style={{ color: "#1e2d4a", fontWeight: "600" }}>
              {item.value}
            </span>
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div
          style={{
            flex: "0 0 48%",
            overflowY: "auto",
            height: "100%",
            padding: "16px 24px 16px 20px",
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
                color: "#7a90aa",
              }}
            >
              {t.folders}
            </span>
            <button
              onClick={() => setShowNewFolderInput((p) => !p)}
              style={{
                padding: "4px 10px",
                background: "none",
                border: "1px solid #c8d4e3",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "Times New Roman",
                fontSize: "12px",
                color: "#1e2d4a",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#eef1f6")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
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
                  borderRadius: "6px",
                  border: "1px solid #c8d4e3",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  outline: "none",
                  color: "#1e2d4a",
                }}
              />
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                style={{
                  padding: "6px 14px",
                  background: "#1e2d4a",
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
            <p style={{ color: "#7a90aa", fontSize: "13px" }}>{t.loading}</p>
          )}
          {!loadingFolders && folders.length === 0 && (
            <p style={{ color: "#7a90aa", fontSize: "13px" }}>{t.no_folders}</p>
          )}

          {!loadingFolders &&
            folders.map((folder) => {
              const isOpen = expandedFolders[folder.id];
              const pubs = folderPubs[folder.id];
              const isEditing = editingFolderId === folder.id;
              return (
                <div key={folder.id} style={{ marginBottom: "6px" }}>
                  {isEditing ? (
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                        padding: "4px 0",
                      }}
                    >
                      <input
                        autoFocus
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateFolder(folder.id);
                          if (e.key === "Escape") cancelEditFolder();
                        }}
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #7fa8d4",
                          fontFamily: "Times New Roman",
                          fontSize: "13px",
                          outline: "none",
                          color: "#1e2d4a",
                        }}
                      />
                      <button
                        onClick={() => handleUpdateFolder(folder.id)}
                        style={{
                          padding: "5px 12px",
                          background: "#1e2d4a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontFamily: "Times New Roman",
                          fontSize: "12px",
                        }}
                      >
                        Išsaugoti
                      </button>
                      <button
                        onClick={cancelEditFolder}
                        style={{
                          padding: "5px 10px",
                          background: "none",
                          border: "1px solid #c8d4e3",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontFamily: "Times New Roman",
                          fontSize: "12px",
                          color: "#7a90aa",
                        }}
                      >
                        Atšaukti
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleToggleFolder(folder.id)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "9px 12px",
                        borderRadius: "7px",
                        background: isOpen ? "#eef1f6" : "#f7f9fc",
                        border: "1px solid #dce3ed",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        transition: "background 0.1s",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#e4eaf3";
                        e.currentTarget.querySelector(
                          ".folder-edit-btn",
                        ).style.opacity = "1";
                        e.currentTarget.querySelector(
                          ".folder-delete-btn",
                        ).style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isOpen
                          ? "#eef1f6"
                          : "#f7f9fc";
                        e.currentTarget.querySelector(
                          ".folder-edit-btn",
                        ).style.opacity = "0";
                        e.currentTarget.querySelector(
                          ".folder-delete-btn",
                        ).style.opacity = "0";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontSize: "10px", color: "#7a90aa" }}>
                          {isOpen ? "▾" : "▸"}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#1e2d4a",
                          }}
                        >
                          {folder.name}
                        </span>
                        {pubs && (
                          <span style={{ fontSize: "11px", color: "#7a90aa" }}>
                            {pubs.length}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          className="folder-edit-btn"
                          onClick={(e) => startEditFolder(e, folder)}
                          style={{
                            padding: "2px 7px",
                            background: "none",
                            border: "1px solid #c8d4e3",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontFamily: "Times New Roman",
                            fontSize: "11px",
                            color: "#5a7090",
                            opacity: 0,
                            transition:
                              "opacity 0.15s, color 0.15s, border-color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#1e2d4a";
                            e.currentTarget.style.borderColor = "#1e2d4a";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#5a7090";
                            e.currentTarget.style.borderColor = "#c8d4e3";
                          }}
                        >
                          Redaguoti
                        </button>
                        <button
                          className="folder-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id, folder.name);
                          }}
                          style={{
                            padding: "2px 7px",
                            background: "none",
                            border: "1px solid #c8d4e3",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontFamily: "Times New Roman",
                            fontSize: "11px",
                            color: "#7a90aa",
                            opacity: 0,
                            transition:
                              "opacity 0.15s, color 0.15s, border-color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#c0392b";
                            e.currentTarget.style.borderColor = "#c0392b";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#7a90aa";
                            e.currentTarget.style.borderColor = "#c8d4e3";
                          }}
                        >
                          {t.delete}
                        </button>
                      </div>
                    </div>
                  )}
                  {isOpen && !isEditing && (
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
                        <p style={{ color: "#7a90aa", fontSize: "12px" }}>
                          {t.loading}
                        </p>
                      )}
                      {pubs && pubs.length === 0 && (
                        <p style={{ color: "#7a90aa", fontSize: "12px" }}>
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
                  color: "#7a90aa",
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

          {!loadingFolders &&
            (folders.length > 0 || projectPubs.length > 0) && (
              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <label
                  style={{
                    fontSize: "10px",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#7a90aa",
                  }}
                >
                  Rekomendacijos pagal
                </label>
                <select
                  value={selectedRecommendationFolder}
                  onChange={(e) =>
                    setSelectedRecommendationFolder(e.target.value)
                  }
                  disabled={recLoading}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "7px",
                    border: "1px solid #c8d4e3",
                    background: "#ffffff",
                    color: "#1e2d4a",
                    fontFamily: "Times New Roman",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="">Visą projektą</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleGetRecommendations}
                  disabled={recLoading}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: recLoading ? "#eef1f6" : "#1e2d4a",
                    color: recLoading ? "#7a90aa" : "#ffffff",
                    border: "1px solid",
                    borderColor: recLoading ? "#dce3ed" : "#1e2d4a",
                    borderRadius: "8px",
                    cursor: recLoading ? "not-allowed" : "pointer",
                    fontFamily: "Times New Roman",
                    fontSize: "14px",
                  }}
                  onMouseEnter={(e) => {
                    if (!recLoading)
                      e.currentTarget.style.background = "#2a3f63";
                  }}
                  onMouseLeave={(e) => {
                    if (!recLoading)
                      e.currentTarget.style.background = "#1e2d4a";
                  }}
                >
                  {recLoading ? t.searching : t.get_recommendations}
                </button>
              </div>
            )}
        </div>

        <div style={{ width: "1px", background: "#dce3ed", flexShrink: 0 }} />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            height: "100%",
            padding: "16px 20px 16px 24px",
            background: "#f7f9fc",
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
                color: "#7a90aa",
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
                    background: "#1e2d4a",
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
                      border: "1px solid #dce3ed",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(30,45,74,0.12)",
                      minWidth: "200px",
                      zIndex: 40,
                      overflow: "hidden",
                    }}
                  >
                    {!selectedSaveProject &&
                      (projects.length === 0 ? (
                        <div
                          style={{
                            padding: "10px 14px",
                            fontFamily: "Times New Roman",
                            color: "#7a90aa",
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
                                color: "#1e2d4a",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                background:
                                  selectedSaveProject?.id === projectItem.id
                                    ? "#eef1f6"
                                    : "none",
                              }}
                            >
                              {projectItem.name}
                              <span
                                style={{ color: "#c8d4e3", fontSize: "11px" }}
                              >
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
                            background: "#eef1f6",
                            border: "none",
                            borderBottom: "1px solid #dce3ed",
                            textAlign: "left",
                            cursor: "pointer",
                            fontFamily: "Times New Roman",
                            fontSize: "12px",
                            color: "#7a90aa",
                          }}
                        >
                          ← {selectedSaveProject.name}
                        </button>
                        {saveFoldersLoading ? (
                          <div
                            style={{
                              padding: "10px 14px",
                              color: "#7a90aa",
                              fontSize: "13px",
                            }}
                          >
                            {t.loading}
                          </div>
                        ) : saveFolders.length === 0 ? (
                          <div
                            style={{
                              padding: "10px 14px",
                              color: "#7a90aa",
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
                                (e.currentTarget.style.background = "#eef1f6")
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
                                color: "#1e2d4a",
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
                color: "#7a90aa",
                fontFamily: "Times New Roman",
                fontSize: "13px",
                textAlign: "center",
                border: "1px dashed #c8d4e3",
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
                color: "#7a90aa",
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
                      background: isSelected ? "#e4eaf3" : "#ffffff",
                      padding: "14px 16px",
                      borderRadius: "8px",
                      border: isSelected
                        ? "1px solid #7fa8d4"
                        : "1px solid #dce3ed",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      boxSizing: "border-box",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#7fa8d4";
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(30,45,74,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isSelected
                        ? "#7fa8d4"
                        : "#dce3ed";
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
                          ? "2px solid #1e2d4a"
                          : "1.5px solid #c8d4e3",
                        background: isSelected ? "#1e2d4a" : "#ffffff",
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
                        color: "#1e2d4a",
                      }}
                    >
                      {rec.title}
                    </p>
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#5a7090",
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
                              rec.similarity >= 55
                                ? "#e8f5ec"
                                : rec.similarity >= 35
                                  ? "#fef9e7"
                                  : "#fdecea",
                            color:
                              rec.similarity >= 55
                                ? "#1e6640"
                                : rec.similarity >= 35
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
        <CreateProjectModal
          open={editProjectOpen}
          onClose={() => setEditProjectOpen(false)}
          onCreate={handleUpdateProject}
          initialProject={currentProject}
          mode="edit"
        />,
        document.body,
      )}
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

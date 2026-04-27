import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PublicationCardModal from "./publicationCardModal";
import ConfirmModal from "./confirmModal";
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
  semanticSearch,
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
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const [rightPanelMode, setRightPanelMode] = useState("recommendations");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState([]);
  const [semanticLoading, setSemanticLoading] = useState(false);

  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target))
        setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const { t } = useLanguage();
  const { showToast } = useToast();

  const openConfirm = (title, message, onConfirm) =>
    setConfirm({ open: true, title, message, onConfirm });
  const closeConfirm = () =>
    setConfirm({ open: false, title: "", message: "", onConfirm: null });

  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return;
    setSemanticLoading(true);
    try {
      const data = await semanticSearch(project.id, semanticQuery.trim());
      setSemanticResults(data.results || []);
    } catch {
      showToast("Nepavyko atlikti paieškos");
    } finally {
      setSemanticLoading(false);
    }
  };

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

  const handleDeleteFolder = (folderId, folderName) => {
    openConfirm(
      "Ištrinti aplanką?",
      `Ar tikrai norite ištrinti aplanką "${folderName}"? Visos publikacijos bus pašalintos.`,
      async () => {
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
      },
    );
  };

  const handleDeletePublication = (folderId, pubId, pubTitle) => {
    openConfirm(
      "Ištrinti publikaciją?",
      `Ar tikrai norite ištrinti "${pubTitle}"?`,
      async () => {
        try {
          await deletePublication(project.id, folderId, pubId);
          setFolderPubs((prev) => ({
            ...prev,
            [folderId]: prev[folderId].filter((p) => p.id !== pubId),
          }));
        } catch {
          showToast("Nepavyko ištrinti publikacijos");
        }
      },
    );
  };

  const handleDeleteProject = () => {
    openConfirm(
      "Ištrinti projektą?",
      `Ar tikrai norite ištrinti projektą "${currentProject.name}"? Šis veiksmas negrįžtamas.`,
      async () => {
        try {
          await deleteProject(project.id);
          onProjectDeleted(project.id);
          onClose();
        } catch {
          showToast("Nepavyko ištrinti projekto");
        }
      },
    );
  };

  const handleDeleteProjectPublication = (pubId, pubTitle) => {
    openConfirm(
      "Ištrinti publikaciją?",
      `Ar tikrai norite ištrinti "${pubTitle}"?`,
      async () => {
        try {
          await deleteProjectPublication(project.id, pubId);
          setProjectPubs((prev) => prev.filter((p) => p.id !== pubId));
        } catch {
          showToast("Nepavyko ištrinti publikacijos");
        }
      },
    );
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

  const handleUpdateProject = async (data) => {
    try {
      const updated = await updateProject(project.id, data);
      setCurrentProject(updated);
      setEditProjectOpen(false);
      onProjectUpdated?.(updated);
      showToast("Projektas atnaujintas", "success");
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
        if (pub.doi) addText(`DOI: ${pub.doi}`, 10);
        y += 4;
      });
      y += 4;
    }
    doc.save(`${currentProject.name}.pdf`);
  };

  const typeToEntry = (pubType) => {
    const map = {
      "journal-article": "article",
      "book-chapter": "incollection",
      book: "book",
      preprint: "misc",
      "proceedings-article": "inproceedings",
    };
    return map[pubType] || "misc";
  };

  const makeBibtexKey = (pub) => {
    const firstAuthor =
      pub.authors?.[0]
        ?.split(" ")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z]/g, "") || "unknown";
    return `${firstAuthor}${pub.year || ""}`;
  };

  const formatBibtexEntry = (pub, keySuffix = "") => {
    const entryType = typeToEntry(pub.pub_type || pub.type);
    const key = makeBibtexKey(pub) + keySuffix;
    const fields = [];
    if (pub.title) fields.push(`  title     = {${pub.title}}`);
    if (pub.authors?.length)
      fields.push(`  author    = {${pub.authors.join(" and ")}}`);
    if (pub.year) fields.push(`  year      = {${pub.year}}`);
    if (pub.source_name) {
      const journalField =
        entryType === "inproceedings" ? "booktitle" : "journal";
      fields.push(`  ${journalField.padEnd(9)} = {${pub.source_name}}`);
    }
    if (pub.doi) fields.push(`  doi       = {${pub.doi}}`);
    if (pub.abstract)
      fields.push(`  abstract  = {${pub.abstract.replace(/[{}]/g, "")}}`);
    if (pub.keywords?.length)
      fields.push(`  keywords  = {${pub.keywords.join(", ")}}`);
    if (pub.language) fields.push(`  language  = {${pub.language}}`);
    return `@${entryType}{${key},\n${fields.join(",\n")}\n}`;
  };

  const formatRisEntry = (pub) => {
    const typeMap = {
      "journal-article": "JOUR",
      "book-chapter": "CHAP",
      book: "BOOK",
      preprint: "RPRT",
      "proceedings-article": "CONF",
    };
    const lines = [];
    lines.push(`TY  - ${typeMap[pub.pub_type || pub.type] || "GEN"}`);
    if (pub.title) lines.push(`TI  - ${pub.title}`);
    (pub.authors || []).forEach((a) => lines.push(`AU  - ${a}`));
    if (pub.year) lines.push(`PY  - ${pub.year}`);
    if (pub.source_name) lines.push(`JO  - ${pub.source_name}`);
    if (pub.doi) lines.push(`DO  - ${pub.doi}`);
    if (pub.abstract) lines.push(`AB  - ${pub.abstract}`);
    (pub.keywords || []).forEach((kw) => lines.push(`KW  - ${kw}`));
    if (pub.language) lines.push(`LA  - ${pub.language}`);
    lines.push("ER  -");
    return lines.join("\n");
  };

  const downloadTextFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const collectAllPubs = async () => {
    const all = [];
    for (const folder of folders) {
      let pubs = folderPubs[folder.id];
      if (!pubs) {
        try {
          pubs = await getPublications(project.id, folder.id);
        } catch {
          pubs = [];
        }
      }
      all.push(...pubs);
    }
    all.push(...projectPubs);
    return all;
  };

  const handleExportBibtex = async () => {
    setExportOpen(false);
    const all = await collectAllPubs();
    const keyCounts = {};
    const entries = all.map((pub) => {
      const baseKey = makeBibtexKey(pub);
      keyCounts[baseKey] = (keyCounts[baseKey] || 0) + 1;
      const suffix =
        keyCounts[baseKey] > 1
          ? String.fromCharCode(96 + keyCounts[baseKey])
          : "";
      return formatBibtexEntry(pub, suffix);
    });
    downloadTextFile(
      entries.join("\n\n"),
      `${currentProject.name}.bib`,
      "text/plain",
    );
  };

  const handleExportRis = async () => {
    setExportOpen(false);
    const all = await collectAllPubs();
    const entries = all.map(formatRisEntry);
    downloadTextFile(
      entries.join("\n\n"),
      `${currentProject.name}.ris`,
      "text/plain",
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("lt-LT", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
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
          onDelete(pub.id, pub.title);
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
        {pub.saved_at && (
          <span style={{ color: "#7a90aa", fontSize: "11px" }}>
            Išsaugota: {formatDate(pub.saved_at)}
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

  const ghostBtn = {
    padding: "6px 13px",
    background: "none",
    border: "1px solid #dce3ed",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#1e2d4a",
    fontFamily: "Times New Roman",
    fontSize: "13px",
  };
  const ghostHover = (e) => {
    e.currentTarget.style.background = "#f0f4fa";
    e.currentTarget.style.borderColor = "#7fa8d4";
  };
  const ghostLeave = (e) => {
    e.currentTarget.style.background = "none";
    e.currentTarget.style.borderColor = "#dce3ed";
  };

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
      <ConfirmModal
        open={confirm.open}
        onClose={closeConfirm}
        onConfirm={confirm.onConfirm ?? (() => {})}
        title={confirm.title}
        message={confirm.message}
        confirmLabel="Ištrinti"
        danger={true}
      />

      <div
        style={{
          background: "#ffffff",
          padding: "14px 20px",
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #dce3ed",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={onClose}
            style={{ ...ghostBtn, color: "#5a7090" }}
            onMouseEnter={ghostHover}
            onMouseLeave={ghostLeave}
          >
            ← {t.back ?? "Back"}
          </button>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: "700",
                color: "#1e2d4a",
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
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                }}
              >
                {currentProject.description}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ position: "relative", display: "flex" }}>
            <button
              onClick={handleGetRecommendations}
              disabled={
                recLoading || (folders.length === 0 && projectPubs.length === 0)
              }
              style={{
                padding: "6px 13px",
                background: recLoading ? "#eef1f6" : "#1e2d4a",
                color: recLoading ? "#7a90aa" : "#ffffff",
                border: "1px solid",
                borderColor: recLoading ? "#dce3ed" : "#1e2d4a",
                borderRight: "none",
                borderRadius: "6px 0 0 6px",
                cursor: recLoading ? "not-allowed" : "pointer",
                fontFamily: "Times New Roman",
                fontSize: "13px",
                fontWeight: "600",
                opacity:
                  folders.length === 0 && projectPubs.length === 0 ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!recLoading) e.currentTarget.style.background = "#2a3f63";
              }}
              onMouseLeave={(e) => {
                if (!recLoading)
                  e.currentTarget.style.background = recLoading
                    ? "#eef1f6"
                    : "#1e2d4a";
              }}
            >
              {recLoading ? t.searching : t.get_recommendations}
            </button>
            <select
              value={selectedRecommendationFolder}
              onChange={(e) => setSelectedRecommendationFolder(e.target.value)}
              disabled={recLoading}
              style={{
                padding: "6px 24px 6px 8px",
                background: recLoading ? "#eef1f6" : "#1e2d4a",
                color: recLoading ? "#7a90aa" : "rgba(255,255,255,0.85)",
                border: "1px solid",
                borderColor: recLoading ? "#dce3ed" : "#1e2d4a",
                borderLeft: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "0 6px 6px 0",
                cursor: recLoading ? "not-allowed" : "pointer",
                fontFamily: "Times New Roman",
                fontSize: "12px",
                outline: "none",
                appearance: "none",
                WebkitAppearance: "none",
                minWidth: "90px",
              }}
            >
              <option value="">Visas projektas</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                fontSize: "9px",
                color: recLoading ? "#7a90aa" : "rgba(255,255,255,0.6)",
              }}
            >
              ▼
            </span>
          </div>

          <div
            style={{
              width: "1px",
              height: "20px",
              background: "#dce3ed",
              margin: "0 2px",
            }}
          />

          <button
            onClick={() => setEditProjectOpen(true)}
            style={ghostBtn}
            onMouseEnter={ghostHover}
            onMouseLeave={ghostLeave}
          >
            Redaguoti
          </button>

          <div style={{ position: "relative" }} ref={exportRef}>
            <button
              onClick={() => setExportOpen((p) => !p)}
              style={ghostBtn}
              onMouseEnter={ghostHover}
              onMouseLeave={ghostLeave}
            >
              {t.export} ▾
            </button>
            {exportOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "#ffffff",
                  border: "1px solid #dce3ed",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(30,45,74,0.12)",
                  minWidth: "160px",
                  zIndex: 40,
                  overflow: "hidden",
                }}
              >
                {[
                  {
                    label: "PDF",
                    sublabel: "Spausdinti / peržiūra",
                    action: () => {
                      setExportOpen(false);
                      handleExport();
                    },
                  },
                  {
                    label: "BibTeX (.bib)",
                    sublabel: "LaTeX, Overleaf",
                    action: handleExportBibtex,
                  },
                  {
                    label: "RIS (.ris)",
                    sublabel: "Zotero, Mendeley",
                    action: handleExportRis,
                  },
                ].map(({ label, sublabel, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f0f4fa")
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
                      boxSizing: "border-box",
                      borderBottom: "1px solid #eef1f6",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#1e2d4a",
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#7a90aa",
                        marginTop: "1px",
                      }}
                    >
                      {sublabel}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleDeleteProject}
            style={{ ...ghostBtn, color: "#c0392b" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fff0ee";
              e.currentTarget.style.borderColor = "#c0392b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.borderColor = "#dce3ed";
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
                onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
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
                        marginBottom: "2px",
                      }}
                      onClick={(e) => e.stopPropagation()}
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
                          border: "1px solid #dce3ed",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontFamily: "Times New Roman",
                          fontSize: "12px",
                          color: "#7a90aa",
                        }}
                      >
                        ✕
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
                        transition: "background 0.1s",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#e8eef7";
                        e.currentTarget.style.borderColor = "#7fa8d4";
                        e.currentTarget
                          .querySelectorAll(".folder-action-btn")
                          .forEach((b) => (b.style.opacity = "1"));
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isOpen
                          ? "#eef1f6"
                          : "#f7f9fc";
                        e.currentTarget.style.borderColor = "#dce3ed";
                        e.currentTarget
                          .querySelectorAll(".folder-action-btn")
                          .forEach((b) => (b.style.opacity = "0"));
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
                          className="folder-action-btn"
                          onClick={(e) => startEditFolder(e, folder)}
                          style={{
                            padding: "2px 7px",
                            background: "none",
                            border: "1px solid #dce3ed",
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
                            e.currentTarget.style.color = "#1e2d4a";
                            e.currentTarget.style.borderColor = "#1e2d4a";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#7a90aa";
                            e.currentTarget.style.borderColor = "#dce3ed";
                          }}
                        >
                          Redaguoti
                        </button>
                        <button
                          className="folder-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id, folder.name);
                          }}
                          style={{
                            padding: "2px 7px",
                            background: "none",
                            border: "1px solid #dce3ed",
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
                            e.currentTarget.style.borderColor = "#dce3ed";
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
                            (id, title) =>
                              handleDeletePublication(folder.id, id, title),
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
                    (id, title) => handleDeleteProjectPublication(id, title),
                    "project",
                  ),
                )}
              </div>
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
              marginBottom: "14px",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "4px",
                background: "#eef1f6",
                borderRadius: "8px",
                padding: "3px",
              }}
            >
              {[
                {
                  key: "recommendations",
                  label: t.recommended ?? "Rekomendacijos",
                },
                { key: "semantic", label: "Semantinė paieška" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setRightPanelMode(key);
                    setSemanticResults([]);
                    setSemanticQuery("");
                  }}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: rightPanelMode === key ? "#ffffff" : "none",
                    boxShadow:
                      rightPanelMode === key
                        ? "0 1px 4px rgba(30,45,74,0.1)"
                        : "none",
                    cursor: "pointer",
                    fontFamily: "Times New Roman",
                    fontSize: "12px",
                    fontWeight: rightPanelMode === key ? "600" : "400",
                    color: rightPanelMode === key ? "#1e2d4a" : "#7a90aa",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {rightPanelMode === "recommendations" &&
              selectedRecs.length > 0 && (
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
                      fontWeight: "600",
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

          {rightPanelMode === "semantic" && (
            <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSemanticSearch()}
                placeholder="pvz. machine learning in healthcare..."
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "7px",
                  border: "1px solid #c8d4e3",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  color: "#1e2d4a",
                  outline: "none",
                  background: "#ffffff",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
              />
              <button
                onClick={handleSemanticSearch}
                disabled={semanticLoading || !semanticQuery.trim()}
                style={{
                  padding: "8px 16px",
                  background:
                    semanticLoading || !semanticQuery.trim()
                      ? "#eef1f6"
                      : "#1e2d4a",
                  color:
                    semanticLoading || !semanticQuery.trim()
                      ? "#7a90aa"
                      : "#ffffff",
                  border: "none",
                  borderRadius: "7px",
                  cursor:
                    semanticLoading || !semanticQuery.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!semanticLoading && semanticQuery.trim())
                    e.currentTarget.style.background = "#2a3f63";
                }}
                onMouseLeave={(e) => {
                  if (!semanticLoading && semanticQuery.trim())
                    e.currentTarget.style.background = "#1e2d4a";
                }}
              >
                {semanticLoading ? "Ieškoma..." : "Ieškoti"}
              </button>
            </div>
          )}

          {rightPanelMode === "semantic" &&
            !semanticLoading &&
            semanticResults.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "220px",
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  border: "1px dashed #c8d4e3",
                  borderRadius: "10px",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                Įveskite užklausą ir raskite semantiškai artimas publikacijas iš
                šio projekto
              </div>
            )}

          {rightPanelMode === "semantic" && semanticLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
                color: "#7a90aa",
                fontFamily: "Times New Roman",
                fontSize: "13px",
              }}
            >
              {t.loading}
            </div>
          )}

          {rightPanelMode === "semantic" &&
            !semanticLoading &&
            semanticResults.length > 0 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "11px",
                    color: "#7a90aa",
                    fontFamily: "Times New Roman",
                  }}
                >
                  Rasta {semanticResults.length} publikacijų pagal semantinį
                  artimumą
                </p>
                {semanticResults.map((pub) => (
                  <div
                    key={pub.id}
                    onClick={() => handleOpenPublication(pub)}
                    style={{
                      background: "#ffffff",
                      padding: "14px 16px",
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
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(30,45,74,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#dce3ed";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px",
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
                      {pub.authors?.length > 0 && (
                        <span>
                          {pub.authors.slice(0, 3).join(", ")}
                          {pub.authors.length > 3 &&
                            ` +${pub.authors.length - 3}`}
                        </span>
                      )}
                      {pub.similarity != null && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "5px",
                            padding: "2px 9px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontFamily: "sans-serif",
                            background:
                              pub.similarity >= 70
                                ? "#e8f5ec"
                                : pub.similarity >= 40
                                  ? "#fef9e7"
                                  : "#eef1f6",
                            color:
                              pub.similarity >= 70
                                ? "#1e6640"
                                : pub.similarity >= 40
                                  ? "#6b5200"
                                  : "#5a7090",
                            width: "fit-content",
                            fontWeight: "600",
                          }}
                        >
                          {pub.similarity}% atitikimas
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          {rightPanelMode === "recommendations" &&
            !recLoading &&
            recommendations.length === 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "260px",
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  border: "1px dashed #c8d4e3",
                  borderRadius: "10px",
                }}
              >
                {t.get_recommendations ?? "Gauti rekomendacijas"}
              </div>
            )}
          {rightPanelMode === "recommendations" && recLoading && (
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
          {rightPanelMode === "recommendations" &&
            !recLoading &&
            recommendations.length > 0 && (
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
                        background: isSelected ? "#eef1f6" : "#ffffff",
                        padding: "14px 16px",
                        borderRadius: "8px",
                        border: isSelected
                          ? "1.5px solid #7fa8d4"
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
                              padding: "2px 9px",
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

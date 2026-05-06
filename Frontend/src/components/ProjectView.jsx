import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PublicationCardModal from "./publicationCardModal";
import CollaboratorsModal from "./collaboratorModal";
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
  getRecommendationFeedback,
  submitRecommendationFeedback,
  getCollaborators,
} from "../services/projectApi";
import { useToast } from "./toastContext";
import { getProjectInsights } from "../services/insightsApi";
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
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderStack, setFolderStack] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);

  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [feedback, setFeedback] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPub, setSelectedPub] = useState(null);
  const [selectedRecs, setSelectedRecs] = useState([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [selectedSaveProject, setSelectedSaveProject] = useState(null);
  const [saveFolders, setSaveFolders] = useState([]);
  const [saveFoldersLoading, setSaveFoldersLoading] = useState(false);
  const [savingRecommendations, setSavingRecommendations] = useState(false);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState(project);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const [rightPanelMode, setRightPanelMode] = useState("recommendations");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [selectedRecommendationFolder, setSelectedRecommendationFolder] =
    useState("");
  const [insightsText, setInsightsText] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsFocus, setInsightsFocus] = useState("bendros");

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const { t } = useLanguage();
  const { showToast } = useToast();

  const openConfirm = (title, message, onConfirm) =>
    setConfirm({ open: true, title, message, onConfirm });
  const closeConfirm = () =>
    setConfirm({ open: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target))
        setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  useEffect(() => {
    if (!project) return;
    setCurrentProject(project);
    setCurrentFolder(null);
    setFolderStack([]);
    setRecommendations([]);
    setSelectedRecs([]);
    setSemanticResults([]);
    setSemanticQuery("");
    setSelectedRecommendationFolder("");
    setInsightsText("");
    setInsightsLoading(false);
    setInsightsFocus("bendros");
    setAnalytics(null);
    setAnalyticsLoading(true);
    setFeedback({});
    loadContent(null);
    getProjectAnalytics(project.id)
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
    getRecommendationFeedback(project.id)
      .then((data) => {
        const map = {};
        data.forEach((f) => {
          map[f.openalex_id] = f.feedback;
        });
        setFeedback(map);
      })
      .catch(() => {});
    getCollaborators(project.id)
      .then(setCollaborators)
      .catch(() => {});
  }, [project]);

  const loadContent = async (folderId) => {
    setLoadingContent(true);
    try {
      const [folders, pubs] = await Promise.all([
        getFolders(project.id, folderId || null),
        folderId
          ? getPublications(project.id, folderId)
          : getProjectPublications(project.id),
      ]);
      setSubfolders(folders);
      setPublications(pubs);
    } catch {
      showToast("Nepavyko įkelti turinio");
    } finally {
      setLoadingContent(false);
    }
  };

  const navigateInto = (folder) => {
    setFolderStack((prev) => [...prev, currentFolder]);
    setCurrentFolder(folder);
    setShowNewFolderInput(false);
    setNewFolderName("");
    loadContent(folder.id);
  };

  const navigateBack = () => {
    const prev = folderStack[folderStack.length - 1];
    setFolderStack((s) => s.slice(0, -1));
    setCurrentFolder(prev);
    loadContent(prev ? prev.id : null);
  };

  const navigateToCrumb = (index) => {
    if (index === -1) {
      setFolderStack([]);
      setCurrentFolder(null);
      loadContent(null);
      return;
    }
    const target = folderStack[index];
    setFolderStack((s) => s.slice(0, index));
    setCurrentFolder(target);
    loadContent(target ? target.id : null);
  };

  if (!project) return null;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const folder = await createFolder(project.id, {
        name: newFolderName.trim(),
        parent: currentFolder?.id || null,
      });
      setSubfolders((prev) => [...prev, folder]);
      setNewFolderName("");
      setShowNewFolderInput(false);
    } catch {
      showToast("Nepavyko sukurti aplanko");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = (folder) => {
    openConfirm(
      "Ištrinti aplanką?",
      `Ar tikrai norite ištrinti aplanką "${folder.name}"? Visi poaplankiai ir publikacijos bus pašalinti.`,
      async () => {
        try {
          await deleteFolder(project.id, folder.id);
          setSubfolders((prev) => prev.filter((f) => f.id !== folder.id));
        } catch {
          showToast("Nepavyko ištrinti aplanko");
        }
      },
    );
  };

  const handleUpdateFolder = async (folderId) => {
    if (!editingFolderName.trim()) return;
    try {
      const updated = await updateFolder(project.id, folderId, {
        name: editingFolderName.trim(),
      });
      setSubfolders((prev) =>
        prev.map((f) => (f.id === folderId ? updated : f)),
      );
      setEditingFolderId(null);
      setEditingFolderName("");
      showToast("Aplankas atnaujintas", "success");
    } catch {
      showToast("Nepavyko atnaujinti aplanko");
    }
  };

  const handleDeletePublication = (pub) => {
    openConfirm(
      "Ištrinti publikaciją?",
      `Ar tikrai norite ištrinti "${pub.title}"?`,
      async () => {
        try {
          if (currentFolder) {
            await deletePublication(project.id, currentFolder.id, pub.id);
          } else {
            await deleteProjectPublication(project.id, pub.id);
          }
          setPublications((prev) => prev.filter((p) => p.id !== pub.id));
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

  const handleGetRecommendations = async () => {
    setRecLoading(true);
    try {
      const folderId = selectedRecommendationFolder
        ? Number(selectedRecommendationFolder)
        : null;
      const data = await getRecommendations(project.id, folderId);
      setRecommendations(data.recommendations || []);
      setSelectedRecs([]);
    } catch {
      showToast("Nepavyko gauti rekomendacijų");
    } finally {
      setRecLoading(false);
    }
  };

  const handleToggleRecommendation = (rec) => {
    setSelectedRecs((prev) =>
      prev.some((p) => p.openalex_id === rec.openalex_id)
        ? prev.filter((p) => p.openalex_id !== rec.openalex_id)
        : [...prev, rec],
    );
  };

  const handleFeedback = async (rec, value) => {
    try {
      await submitRecommendationFeedback(
        project.id,
        rec.openalex_id,
        rec.title,
        value,
      );
      setFeedback((prev) => ({ ...prev, [rec.openalex_id]: value }));
      showToast(
        value === "positive"
          ? "Ačiū už teigiamą įvertinimą"
          : "Ačiū už įvertinimą",
        "success",
      );
    } catch {
      showToast("Nepavyko išsaugoti įvertinimo");
    }
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

  const handleGetInsights = async () => {
    setInsightsText("");
    setInsightsLoading(true);
    try {
      const text = await getProjectInsights(project.id, insightsFocus);
      setInsightsText(text);
    } catch {
      showToast("Nepavyko gauti įžvalgų");
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleLabelChange = (pubId, newLabel) => {
    setPublications((prev) =>
      prev.map((p) => (p.id === pubId ? { ...p, label: newLabel } : p)),
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

  const typeToEntry = (pubType) =>
    ({
      "journal-article": "article",
      "book-chapter": "incollection",
      book: "book",
      preprint: "misc",
      "proceedings-article": "inproceedings",
    })[pubType] || "misc";
  const makeBibtexKey = (pub) =>
    `${
      pub.authors?.[0]
        ?.split(" ")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z]/g, "") || "unknown"
    }${pub.year || ""}`;

  const formatBibtexEntry = (pub, suffix = "") => {
    const type = typeToEntry(pub.pub_type || pub.type);
    const key = makeBibtexKey(pub) + suffix;
    const fields = [];
    if (pub.title) fields.push(`  title     = {${pub.title}}`);
    if (pub.authors?.length)
      fields.push(`  author    = {${pub.authors.join(" and ")}}`);
    if (pub.year) fields.push(`  year      = {${pub.year}}`);
    if (pub.source_name)
      fields.push(
        `  ${type === "inproceedings" ? "booktitle" : "journal"} = {${pub.source_name}}`,
      );
    if (pub.doi) fields.push(`  doi       = {${pub.doi}}`);
    return `@${type}{${key},\n${fields.join(",\n")}\n}`;
  };

  const formatRisEntry = (pub) => {
    const typeMap = {
      "journal-article": "JOUR",
      "book-chapter": "CHAP",
      book: "BOOK",
      preprint: "RPRT",
      "proceedings-article": "CONF",
    };
    const lines = [`TY  - ${typeMap[pub.pub_type || pub.type] || "GEN"}`];
    if (pub.title) lines.push(`TI  - ${pub.title}`);
    (pub.authors || []).forEach((a) => lines.push(`AU  - ${a}`));
    if (pub.year) lines.push(`PY  - ${pub.year}`);
    if (pub.source_name) lines.push(`JO  - ${pub.source_name}`);
    if (pub.doi) lines.push(`DO  - ${pub.doi}`);
    lines.push("ER  -");
    return lines.join("\n");
  };

  const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const collectAllPubs = async () => {
    const allPubs = [];
    const rootPubs = await getProjectPublications(project.id);
    allPubs.push(...rootPubs);
    const rootFolders = await getFolders(project.id, null);
    const collectFromFolder = async (folderId) => {
      const [pubs, folders] = await Promise.all([
        getPublications(project.id, folderId),
        getFolders(project.id, folderId),
      ]);
      allPubs.push(...pubs);
      for (const folder of folders) {
        await collectFromFolder(folder.id);
      }
    };
    for (const folder of rootFolders) {
      await collectFromFolder(folder.id);
    }
    const seen = new Set();
    return allPubs.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  };

  const handleExportBibtex = async () => {
    setExportOpen(false);
    const all = await collectAllPubs();
    const counts = {};
    const entries = all.map((pub) => {
      const base = makeBibtexKey(pub);
      counts[base] = (counts[base] || 0) + 1;
      return formatBibtexEntry(
        pub,
        counts[base] > 1 ? String.fromCharCode(96 + counts[base]) : "",
      );
    });
    downloadFile(
      entries.join("\n\n"),
      `${currentProject.name}.bib`,
      "text/plain",
    );
  };

  const handleExportRis = async () => {
    setExportOpen(false);
    const all = await collectAllPubs();
    downloadFile(
      all.map(formatRisEntry).join("\n\n"),
      `${currentProject.name}.ris`,
      "text/plain",
    );
  };

  const handleExportPdf = async () => {
    setExportOpen(false);
    const all = await collectAllPubs();
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;
    const addText = (text, size, isBold = false, color = [0, 0, 0]) => {
      doc.setFontSize(size);
      doc.setFont("Times New Roman", isBold ? "bold" : "normal");
      doc.setTextColor(...color);
      doc.splitTextToSize(String(text ?? ""), maxWidth).forEach((line) => {
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
    all.forEach((pub, i) => {
      if (y > 255) {
        doc.addPage();
        y = 20;
      }
      addText(`${i + 1}. ${pub.title}`, 11, true);
      if (pub.year) addText(`Year: ${pub.year}`, 10);
      if (pub.authors?.length)
        addText(`Authors: ${pub.authors.slice(0, 5).join(", ")}`, 10);
      if (pub.doi) addText(`DOI: ${pub.doi}`, 10);
      y += 3;
    });
    doc.save(`${currentProject.name}.pdf`);
  };

  const ghostBtn = {
    padding: "6px 13px",
    background: "none",
    border: "1px solid #dce3ed",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#1e2d4a",
    fontFamily: "Times New Roman",
    fontSize: "13px",
    outline: "none",
  };
  const ghostHover = (e) => {
    e.currentTarget.style.background = "#f0f4fa";
    e.currentTarget.style.borderColor = "#7fa8d4";
  };
  const ghostLeave = (e) => {
    e.currentTarget.style.background = "none";
    e.currentTarget.style.borderColor = "#dce3ed";
  };

  const membersCount = collaborators.filter(
    (c) => c.status === "accepted",
  ).length;

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
        danger
      />

      <div
        style={{
          background: "#ffffff",
          padding: "10px 20px",
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #dce3ed",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
              }}
            >
              {currentProject.name}
            </h2>
            {currentProject.description && (
              <p
                style={{
                  margin: "1px 0 0",
                  fontSize: "12px",
                  color: "#7a90aa",
                }}
              >
                {currentProject.description}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div
            style={{ width: "1px", height: "20px", background: "#dce3ed" }}
          />
          <button
            onClick={() => setCollabModalOpen(true)}
            style={ghostBtn}
            onMouseEnter={ghostHover}
            onMouseLeave={ghostLeave}
          >
            {membersCount > 1 ? `Nariai (${membersCount})` : "Nariai"}
          </button>
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
                  { label: "PDF", action: handleExportPdf },
                ].map(({ label, action }) => (
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
                      borderBottom: "1px solid #eef1f6",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      fontSize: "13px",
                      color: "#1e2d4a",
                      boxSizing: "border-box",
                    }}
                  >
                    {label}
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
          padding: "4px 20px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {folderStack.filter(Boolean).map((f, i) => (
          <span
            key={f.id}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span
              onClick={() => navigateToCrumb(i)}
              style={{ fontSize: "12px", color: "#2a5db0", cursor: "pointer" }}
            >
              {f.name}
            </span>
            <span style={{ color: "#7a90aa", fontSize: "11px" }}>›</span>
          </span>
        ))}
        {currentFolder && (
          <span
            style={{ fontSize: "12px", color: "#1e2d4a", fontWeight: "600" }}
          >
            {currentFolder.name}
          </span>
        )}
        {!currentFolder && folderStack.filter(Boolean).length === 0 && (
          <span style={{ fontSize: "12px", color: "#7a90aa" }}>
            Pradžia
          </span>
        )}
        <div style={{ marginLeft: "auto" }}>
          <span
            style={{
              display: "flex",
              gap: "4px",
              alignItems: "center",
              fontSize: "11px",
            }}
          >
            <span
              style={{
                color: "#7a90aa",
                fontWeight: "700",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontSize: "9px",
              }}
            >
              Publikacijos
            </span>
            <span style={{ color: "#1e2d4a", fontWeight: "600" }}>
              {analyticsLoading ? "..." : (analytics?.total_publications ?? 0)}
            </span>
          </span>
        </div>
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {currentFolder && (
                <button
                  onClick={navigateBack}
                  style={{
                    ...ghostBtn,
                    padding: "4px 8px",
                    fontSize: "12px",
                    color: "#5a7090",
                  }}
                  onMouseEnter={ghostHover}
                  onMouseLeave={ghostLeave}
                >
                  ← Atgal
                </button>
              )}
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#7a90aa",
                }}
              >
                {currentFolder ? currentFolder.name : t.folders}
              </span>
            </div>
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

          {loadingContent && (
            <p style={{ color: "#7a90aa", fontSize: "13px" }}>{t.loading}</p>
          )}
          {!loadingContent &&
            subfolders.length === 0 &&
            publications.length === 0 && (
              <p style={{ color: "#7a90aa", fontSize: "13px" }}>
                {currentFolder ? t.folder_empty : t.no_folders}
              </p>
            )}

          {!loadingContent &&
            subfolders.map((folder) => {
              const isEditing = editingFolderId === folder.id;
              return (
                <div key={folder.id} style={{ marginBottom: "6px" }}>
                  {isEditing ? (
                    <div
                      style={{ display: "flex", gap: "6px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateFolder(folder.id);
                          if (e.key === "Escape") {
                            setEditingFolderId(null);
                            setEditingFolderName("");
                          }
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
                        onClick={() => {
                          setEditingFolderId(null);
                          setEditingFolderName("");
                        }}
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
                      onClick={() => navigateInto(folder)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: "7px",
                        background: "#f7f9fc",
                        border: "1px solid #dce3ed",
                        cursor: "pointer",
                        transition: "all 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#e8eef7";
                        e.currentTarget.style.borderColor = "#7fa8d4";
                        e.currentTarget
                          .querySelectorAll(".folder-action-btn")
                          .forEach((b) => (b.style.opacity = "1"));
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f7f9fc";
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
                          gap: "10px",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "#1e2d4a",
                            }}
                          >
                            {folder.name}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#7a90aa",
                              marginLeft: "8px",
                            }}
                          >
                            {folder.subfolder_count > 0 &&
                              `${folder.subfolder_count} aplankai · `}
                            {folder.publication_count} pub.
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          alignItems: "center",
                        }}
                      >
                        <button
                          className="folder-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(folder.id);
                            setEditingFolderName(folder.name);
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
                            transition: "opacity 0.15s",
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
                            handleDeleteFolder(folder);
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
                            transition: "opacity 0.15s",
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
                        <span style={{ color: "#c8d4e3", fontSize: "12px" }}>
                          ›
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {!loadingContent && publications.length > 0 && (
            <div style={{ marginTop: subfolders.length > 0 ? "16px" : "0" }}>
              {subfolders.length > 0 && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "700",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#7a90aa",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Publikacijos
                </span>
              )}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {publications.map((pub) => {
                  const firstNote = pub.notes?.[0];
                  return (
                    <div
                      key={pub.id}
                      onClick={() => handleOpenPublication(pub)}
                      style={{
                        background: "#ffffff",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border: "1px solid #dce3ed",
                        cursor: "pointer",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#7fa8d4";
                        e.currentTarget.style.boxShadow =
                          "0 2px 8px rgba(30,45,74,0.08)";
                        const btn =
                          e.currentTarget.querySelector(".delete-btn");
                        if (btn) btn.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#dce3ed";
                        e.currentTarget.style.boxShadow = "none";
                        const btn =
                          e.currentTarget.querySelector(".delete-btn");
                        if (btn) btn.style.opacity = "0";
                      }}
                    >
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePublication(pub);
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
                          transition: "opacity 0.15s",
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
                          marginTop: "5px",
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
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-end",
                            marginTop: "2px",
                          }}
                        >
                          <LabelBadge
                            pubId={pub.id}
                            currentLabel={pub.label}
                            onChange={(newLabel) =>
                              handleLabelChange(pub.id, newLabel)
                            }
                          />
                          {firstNote && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#7a90aa",
                                fontStyle: "italic",
                                maxWidth: "55%",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textAlign: "right",
                              }}
                            >
                              Pastaba:{" "}
                              {firstNote.text.length > 40
                                ? firstNote.text.slice(0, 40) + "..."
                                : firstNote.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                { key: "semantic", label: "Paieška" },
                { key: "insights", label: "Įžvalgos" },
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
                      padding: "5px 12px",
                      background: "#1e2d4a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      fontSize: "12px",
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
                      {!selectedSaveProject ? (
                        projects.map((projectItem) => (
                          <div
                            key={projectItem.id}
                            onMouseEnter={() =>
                              handleSelectSaveProject(projectItem)
                            }
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
                                background:
                                  selectedSaveProject?.id === projectItem.id
                                    ? "#eef1f6"
                                    : "none",
                              }}
                            >
                              {projectItem.name}
                              <span style={{ color: "#c8d4e3" }}>▸</span>
                            </div>
                          </div>
                        ))
                      ) : (
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
            <div style={{ marginBottom: "14px", display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSemanticSearch()}
                placeholder=""
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
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  fontWeight: "600",
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
                  alignItems: "center",
                  justifyContent: "center",
                  height: "200px",
                  color: "#7a90aa",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  border: "1px dashed #c8d4e3",
                  borderRadius: "10px",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                Įveskite užklausą ir raskite publikacijas iš
                šio projekto
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
                    margin: "0 0 6px",
                    fontSize: "11px",
                    color: "#7a90aa",
                  }}
                >
                  Rasta {semanticResults.length} rezultatų
                </p>
                {semanticResults.map((pub) => (
                  <div
                    key={pub.id}
                    onClick={() => handleOpenPublication(pub)}
                    style={{
                      background: "#ffffff",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #dce3ed",
                      cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s",
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
                        margin: "0 0 5px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#1e2d4a",
                      }}
                    >
                      {pub.title}
                    </p>
                    <div style={{ fontSize: "12px", color: "#5a7090" }}>
                      <span>
                        {t.year} {pub.year ?? "—"}
                      </span>
                      {pub.similarity != null && (
                        <span
                          style={{
                            marginLeft: "8px",
                            padding: "1px 8px",
                            borderRadius: "20px",
                            fontSize: "11px",
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

          {rightPanelMode === "insights" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div style={{ position: "relative" }}>
                  <select
                    value={insightsFocus}
                    onChange={(e) => setInsightsFocus(e.target.value)}
                    disabled={insightsLoading}
                    style={{
                      padding: "7px 28px 7px 10px",
                      borderRadius: "6px",
                      border: "1px solid #c8d4e3",
                      fontFamily: "Times New Roman",
                      fontSize: "12px",
                      color: "#1e2d4a",
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                      background: "#ffffff",
                      cursor: insightsLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    <option value="bendros">Bendros įžvalgos</option>
                    <option value="temos">Temos ir kryptys</option>
                    <option value="metodologija">Metodologija</option>
                    <option value="spragos">Mokslinės spragos</option>
                  </select>
                  <span
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      fontSize: "9px",
                      color: "#7a90aa",
                    }}
                  >
                    ▼
                  </span>
                </div>
                <button
                  onClick={handleGetInsights}
                  disabled={insightsLoading}
                  style={{
                    padding: "7px 16px",
                    background: insightsLoading ? "#eef1f6" : "#1e2d4a",
                    color: insightsLoading ? "#7a90aa" : "#ffffff",
                    border: "none",
                    borderRadius: "7px",
                    cursor: insightsLoading ? "not-allowed" : "pointer",
                    fontFamily: "Times New Roman",
                    fontSize: "13px",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!insightsLoading)
                      e.currentTarget.style.background = "#2a3f63";
                  }}
                  onMouseLeave={(e) => {
                    if (!insightsLoading)
                      e.currentTarget.style.background = "#1e2d4a";
                  }}
                >
                  {insightsLoading
                    ? "Analizuojama..."
                    : insightsText
                      ? "Analizuoti iš naujo"
                      : "Analizuoti"}
                </button>
              </div>

              {!insightsText && !insightsLoading && (
                <div
                  style={{
                    display: "flex",
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
                  Spauskite „Analizuoti" ir dirbtinio intelekto modelis pateiks
                  įžvalgas apie projekto publikacijas
                </div>
              )}
              {(insightsText || insightsLoading) && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dce3ed",
                    borderRadius: "10px",
                    padding: "18px 20px",
                    fontFamily: "Times New Roman",
                    fontSize: "13.5px",
                    lineHeight: "1.75",
                    color: "#1e2d4a",
                    whiteSpace: "pre-wrap",
                    minHeight: "120px",
                  }}
                >
                  {insightsLoading ? (
                    <span style={{ color: "#7a90aa" }}>
                      Modelis analizuoja publikacijas...
                    </span>
                  ) : (
                    insightsText
                  )}
                </div>
              )}
              {insightsText && !insightsLoading && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(insightsText);
                      showToast("Įžvalgos nukopijuotos", "success");
                    }}
                    style={{
                      padding: "5px 12px",
                      background: "none",
                      border: "1px solid #dce3ed",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      fontSize: "12px",
                      color: "#5a7090",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#1e2d4a";
                      e.currentTarget.style.color = "#1e2d4a";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#dce3ed";
                      e.currentTarget.style.color = "#5a7090";
                    }}
                  >
                    Kopijuoti
                  </button>
                </div>
              )}
            </div>
          )}

          {rightPanelMode === "recommendations" &&
            !recLoading &&
            recommendations.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex" }}>
                  <button
                    onClick={handleGetRecommendations}
                    disabled={recLoading}
                    style={{
                      padding: "7px 14px",
                      background: "#1e2d4a",
                      color: "#ffffff",
                      border: "1px solid #1e2d4a",
                      borderRight: "none",
                      borderRadius: "6px 0 0 6px",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#2a3f63")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#1e2d4a")
                    }
                  >
                    {t.get_recommendations}
                  </button>
                  <div style={{ position: "relative" }}>
                    <select
                      value={selectedRecommendationFolder}
                      onChange={(e) =>
                        setSelectedRecommendationFolder(e.target.value)
                      }
                      style={{
                        padding: "7px 22px 7px 8px",
                        background: "#1e2d4a",
                        color: "rgba(255,255,255,0.85)",
                        border: "1px solid #1e2d4a",
                        borderLeft: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "0 6px 6px 0",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "12px",
                        outline: "none",
                        appearance: "none",
                        WebkitAppearance: "none",
                        minWidth: "110px",
                      }}
                    >
                      <option value="">Visas projektas</option>
                      {subfolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <span
                      style={{
                        position: "absolute",
                        right: "6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        fontSize: "8px",
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      ▼
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "220px",
                    color: "#7a90aa",
                    fontFamily: "Times New Roman",
                    fontSize: "13px",
                    border: "1px dashed #c8d4e3",
                    borderRadius: "10px",
                  }}
                >
                  {t.get_recommendations ?? "Gauti rekomendacijas"}
                </div>
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
                <div style={{ display: "flex", marginBottom: "4px" }}>
                  <button
                    onClick={handleGetRecommendations}
                    style={{
                      padding: "5px 12px",
                      background: "#1e2d4a",
                      color: "#ffffff",
                      border: "1px solid #1e2d4a",
                      borderRight: "none",
                      borderRadius: "6px 0 0 6px",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#2a3f63")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#1e2d4a")
                    }
                  >
                    Atnaujinti
                  </button>
                  <div style={{ position: "relative" }}>
                    <select
                      value={selectedRecommendationFolder}
                      onChange={(e) =>
                        setSelectedRecommendationFolder(e.target.value)
                      }
                      style={{
                        padding: "5px 20px 5px 8px",
                        background: "#1e2d4a",
                        color: "rgba(255,255,255,0.85)",
                        border: "1px solid #1e2d4a",
                        borderLeft: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "0 6px 6px 0",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "11px",
                        outline: "none",
                        appearance: "none",
                        WebkitAppearance: "none",
                        minWidth: "100px",
                      }}
                    >
                      <option value="">Visas projektas</option>
                      {subfolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <span
                      style={{
                        position: "absolute",
                        right: "6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        fontSize: "8px",
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      ▼
                    </span>
                  </div>
                </div>
                {recommendations.map((rec, i) => {
                  const isSelected = selectedRecs.some(
                    (p) => p.openalex_id === rec.openalex_id,
                  );
                  const myFeedback = feedback[rec.openalex_id];
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
                        transition: "border-color 0.15s, box-shadow 0.15s",
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
                              marginTop: "4px",
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
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginTop: "8px",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleFeedback(rec, "positive")}
                          style={{
                            padding: "2px 10px",
                            background:
                              myFeedback === "positive" ? "#e8f5ec" : "none",
                            border: `1px solid ${myFeedback === "positive" ? "#27744f" : "#dce3ed"}`,
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontFamily: "Times New Roman",
                            fontSize: "11px",
                            color:
                              myFeedback === "positive" ? "#27744f" : "#7a90aa",
                          }}
                          onMouseEnter={(e) => {
                            if (myFeedback !== "positive") {
                              e.currentTarget.style.borderColor = "#27744f";
                              e.currentTarget.style.color = "#27744f";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (myFeedback !== "positive") {
                              e.currentTarget.style.borderColor = "#dce3ed";
                              e.currentTarget.style.color = "#7a90aa";
                            }
                          }}
                        >
                          Aktualu
                        </button>
                        <button
                          onClick={() => handleFeedback(rec, "negative")}
                          style={{
                            padding: "2px 10px",
                            background:
                              myFeedback === "negative" ? "#fdecea" : "none",
                            border: `1px solid ${myFeedback === "negative" ? "#c0392b" : "#dce3ed"}`,
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontFamily: "Times New Roman",
                            fontSize: "11px",
                            color:
                              myFeedback === "negative" ? "#c0392b" : "#7a90aa",
                          }}
                          onMouseEnter={(e) => {
                            if (myFeedback !== "negative") {
                              e.currentTarget.style.borderColor = "#c0392b";
                              e.currentTarget.style.color = "#c0392b";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (myFeedback !== "negative") {
                              e.currentTarget.style.borderColor = "#dce3ed";
                              e.currentTarget.style.color = "#7a90aa";
                            }
                          }}
                        >
                          Neaktualu
                        </button>
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
      {createPortal(
        <CollaboratorsModal
          open={collabModalOpen}
          onClose={() => setCollabModalOpen(false)}
          project={project}
        />,
        document.body,
      )}
    </div>
  );
}

export default ProjectView;

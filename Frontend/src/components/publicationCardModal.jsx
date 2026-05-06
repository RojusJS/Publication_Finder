import React from "react";
import Modal from "./modal";
import CitationGraphModal from "./citationGraphModal";
import {
  savePublication,
  getFolders,
  savePublicationToProject,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  sharePublication,
} from "../services/projectApi";
import { useLanguage } from "./language";
import { useToast } from "./toastContext";

function InstitutionsList({ institutions, highlightName }) {
  const [expanded, setExpanded] = React.useState(false);
  const PREVIEW_COUNT = 3;
  const { t } = useLanguage();

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
      <strong style={{ color: "#1e2d4a" }}>{t.institutions}:</strong>{" "}
      <span style={{ color: "#5a7090" }}>
        {visible.join(", ")}
        {!expanded && sorted.length > PREVIEW_COUNT && (
          <>
            {" "}
            <button
              onClick={() => setExpanded(true)}
              style={{
                background: "none",
                border: "none",
                color: "#2a5db0",
                cursor: "pointer",
                padding: 0,
                fontFamily: "Times New Roman",
                fontSize: "14px",
              }}
            >
              {t.show_more} {sorted.length - PREVIEW_COUNT} ...
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
                color: "#2a5db0",
                cursor: "pointer",
                padding: 0,
                fontFamily: "Times New Roman",
                fontSize: "14px",
              }}
            >
              {t.show_less}
            </button>
          </>
        )}
      </span>
    </div>
  );
}

function PublicationNotes({ pubId }) {
  const [notes, setNotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [newText, setNewText] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [editText, setEditText] = React.useState("");

  React.useEffect(() => {
    setLoading(true);
    getNotes(pubId)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [pubId]);

  const handleCreate = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      const note = await createNote(pubId, newText.trim());
      setNotes((prev) => [...prev, note]);
      setNewText("");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (noteId) => {
    if (!editText.trim()) return;
    try {
      const updated = await updateNote(pubId, noteId, editText.trim());
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingId(null);
    } catch {}
  };

  const handleDelete = async (noteId) => {
    try {
      await deleteNote(pubId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {}
  };

  return (
    <div style={{ marginTop: "8px" }}>
      <div
        style={{
          width: "100%",
          height: "1px",
          background: "#eef1f6",
          marginBottom: "16px",
        }}
      />
      <strong
        style={{
          fontFamily: "Times New Roman",
          color: "#1e2d4a",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontSize: "10px",
          fontWeight: "700",
        }}
      >
        Pastabos
      </strong>
      {loading ? (
        <p style={{ color: "#7a90aa", fontSize: "13px", marginTop: "8px" }}>
          Kraunama...
        </p>
      ) : (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                background: "#f7f9fc",
                border: "1px solid #dce3ed",
                borderRadius: "8px",
                padding: "10px 14px",
                fontFamily: "Times New Roman",
              }}
            >
              {editingId === note.id ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #c8d4e3",
                      fontFamily: "Times New Roman",
                      fontSize: "13px",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                      color: "#1e2d4a",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => handleUpdate(note.id)}
                      style={{
                        padding: "3px 12px",
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
                      onClick={() => setEditingId(null)}
                      style={{
                        padding: "3px 12px",
                        background: "none",
                        color: "#7a90aa",
                        border: "1px solid #dce3ed",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "12px",
                      }}
                    >
                      Atšaukti
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                      color: "#1e2d4a",
                    }}
                  >
                    {note.text}
                  </p>
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditingId(note.id);
                        setEditText(note.text);
                      }}
                      style={{
                        padding: "2px 8px",
                        background: "none",
                        border: "1px solid #dce3ed",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "11px",
                        color: "#7a90aa",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#7fa8d4";
                        e.currentTarget.style.color = "#1e2d4a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#dce3ed";
                        e.currentTarget.style.color = "#7a90aa";
                      }}
                    >
                      Redaguoti
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      style={{
                        padding: "2px 8px",
                        background: "none",
                        border: "1px solid #dce3ed",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "11px",
                        color: "#7a90aa",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#c0392b";
                        e.currentTarget.style.color = "#c0392b";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#dce3ed";
                        e.currentTarget.style.color = "#7a90aa";
                      }}
                    >
                      Ištrinti
                    </button>
                  </div>
                </div>
              )}
              <span
                style={{
                  fontSize: "11px",
                  color: "#7a90aa",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {new Date(note.created_at).toLocaleDateString("lt-LT", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Pridėti pastabą..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                  handleCreate();
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "7px",
                border: "1px solid #c8d4e3",
                fontFamily: "Times New Roman",
                fontSize: "13px",
                resize: "vertical",
                outline: "none",
                color: "#1e2d4a",
                boxSizing: "border-box",
                background: "#f7f9fc",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
            />
            {newText.trim() && (
              <button
                onClick={handleCreate}
                disabled={saving}
                style={{
                  alignSelf: "flex-end",
                  padding: "5px 14px",
                  background: saving ? "#7a90aa" : "#1e2d4a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "7px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                }}
              >
                {saving ? "Saugoma..." : "Pridėti"}
              </button>
            )}
          </div>
        </div>
      )}
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
  const { t } = useLanguage();
  const [graphOpen, setGraphOpen] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState(null);
  const [folders, setFolders] = React.useState([]);
  const [foldersLoading, setFoldersLoading] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareUsername, setShareUsername] = React.useState("");
  const [shareMessage, setShareMessage] = React.useState("");
  const [sharing, setSharing] = React.useState(false);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (!open) {
      setGraphOpen(false);
      setSaveOpen(false);
      setSelectedProject(null);
      setFolders([]);
      setShareOpen(false);
      setShareUsername("");
      setShareMessage("");
      setSharing(false);
    }
  }, [open]);

  const handleShare = async () => {
    if (!shareUsername.trim()) return;
    setSharing(true);
    try {
      const pubData = {
        openalex_id: pub.openalex_id || pub.id,
        title: pub.title,
        year: pub.year,
        doi: pub.doi,
        authors: pub.authors,
        abstract: pub.abstract,
        source_name: pub.source_name,
        cited_by_count: pub.cited_by_count,
        is_oa: pub.is_oa,
        pub_type: pub.type || pub.pub_type,
        keywords: pub.keywords,
        pdf_url: pub.pdf_url,
        landing_page_url: pub.landing_page_url,
        institutions: pub.institutions,
        language: pub.language,
      };
      await sharePublication(
        shareUsername.trim(),
        pubData,
        shareMessage.trim(),
      );
      showToast("Publikacija išsiųsta", "success");
      setShareOpen(false);
      setShareUsername("");
      setShareMessage("");
    } catch (e) {
      showToast(e?.response?.data?.error || "Nepavyko išsiųsti publikacijos");
    } finally {
      setSharing(false);
    }
  };

  const handleSelectProject = async (project) => {
    if (selectedProject?.id === project.id) {
      setSelectedProject(null);
      setFolders([]);
      return;
    }
    setSelectedProject(project);
    setFolders([]);
    setFoldersLoading(true);
    try {
      const data = await getFolders(project.id);
      setFolders(data);
    } catch {
      showToast("Nepavyko gauti aplankų");
    } finally {
      setFoldersLoading(false);
    }
  };

  const handleSaveToFolder = async (folderId) => {
    try {
      setSaving(true);
      if (folderId === null) {
        await savePublicationToProject(selectedProject.id, pub);
      } else {
        await savePublication(selectedProject.id, folderId, pub);
      }
      showToast(t.saved, "success");
      setSaveOpen(false);
      setSelectedProject(null);
      setFolders([]);
    } catch {
      showToast("Nepavyko išsaugoti");
    } finally {
      setSaving(false);
    }
  };

  if (!pub) return null;

  const metaStyle = {
    fontSize: "13px",
    color: "#5a7090",
    fontFamily: "Times New Roman",
  };
  const labelStyle = { fontWeight: "700", color: "#1e2d4a" };

  return (
    <>
      <Modal open={open} onClose={onClose} title={pub.title} maxWidth="820px">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            fontSize: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setGraphOpen(true)}
              style={{
                padding: "6px 14px",
                borderRadius: "7px",
                border: "1px solid #dce3ed",
                background: "#1e2d4a",
                cursor: "pointer",
                fontFamily: "Times New Roman",
                fontSize: "13px",
                color: "#ffffff",
                fontWeight: "600",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#2a3f63")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#1e2d4a")
              }
            >
              {t.show_citation_graph}
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
                  padding: "6px 14px",
                  borderRadius: "7px",
                  border: "1px solid #dce3ed",
                  background: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  color: "#1e2d4a",
                  opacity: saving ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f4fa";
                  e.currentTarget.style.borderColor = "#7fa8d4";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.borderColor = "#dce3ed";
                }}
              >
                {saving ? t.saving : t.save_to_project}
              </button>

              {saveOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    background: "#ffffff",
                    border: "1px solid #dce3ed",
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(30,45,74,0.12)",
                    minWidth: "240px",
                    zIndex: 20,
                    overflow: "hidden",
                  }}
                >
                  {projects.length === 0 ? (
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
                    projects.map((project) => (
                      <div key={project.id}>
                        <div
                          onClick={() => handleSelectProject(project)}
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
                              selectedProject?.id === project.id
                                ? "#eef1f6"
                                : "none",
                            borderBottom:
                              selectedProject?.id === project.id
                                ? "none"
                                : "1px solid #f4f6f9",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedProject?.id !== project.id)
                              e.currentTarget.style.background = "#f7f9fc";
                          }}
                          onMouseLeave={(e) => {
                            if (selectedProject?.id !== project.id)
                              e.currentTarget.style.background = "none";
                          }}
                        >
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              paddingRight: "8px",
                            }}
                          >
                            {project.name}
                          </span>
                          <span
                            style={{
                              color: "#7a90aa",
                              fontSize: "11px",
                              flexShrink: 0,
                            }}
                          >
                            {selectedProject?.id === project.id ? "▾" : "▸"}
                          </span>
                        </div>

                        {selectedProject?.id === project.id && (
                          <div
                            style={{
                              background: "#fbfcfe",
                              borderTop: "1px solid #eef1f6",
                              borderBottom: "1px solid #eef1f6",
                            }}
                          >
                            {foldersLoading ? (
                              <div
                                style={{
                                  padding: "10px 18px",
                                  color: "#7a90aa",
                                  fontSize: "13px",
                                  fontFamily: "Times New Roman",
                                }}
                              >
                                {t.loading}
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleSaveToFolder(null)}
                                  style={{
                                    width: "100%",
                                    padding: "9px 18px",
                                    background: "none",
                                    border: "none",
                                    borderBottom: "1px solid #eef1f6",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    fontFamily: "Times New Roman",
                                    fontSize: "13px",
                                    color: "#7a90aa",
                                    fontStyle: "italic",
                                    boxSizing: "border-box",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "#eef1f6")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "none")
                                  }
                                >
                                  Išsaugoti pačiame projekte
                                </button>
                                {folders.length === 0 ? (
                                  <div
                                    style={{
                                      padding: "10px 18px",
                                      color: "#7a90aa",
                                      fontSize: "13px",
                                      fontFamily: "Times New Roman",
                                    }}
                                  >
                                    {t.no_folders_dropdown}
                                  </div>
                                ) : (
                                  folders.map((folder) => (
                                    <button
                                      key={folder.id}
                                      onClick={() =>
                                        handleSaveToFolder(folder.id)
                                      }
                                      style={{
                                        width: "100%",
                                        padding: "9px 18px",
                                        background: "none",
                                        border: "none",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontFamily: "Times New Roman",
                                        fontSize: "13px",
                                        color: "#1e2d4a",
                                        boxSizing: "border-box",
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                          "#eef1f6")
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                          "none")
                                      }
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
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShareOpen((p) => !p)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "7px",
                  border: "1px solid #dce3ed",
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  color: "#1e2d4a",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f4fa";
                  e.currentTarget.style.borderColor = "#7fa8d4";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.borderColor = "#dce3ed";
                }}
              >
                Dalintis
              </button>
              {shareOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    background: "#ffffff",
                    border: "1px solid #dce3ed",
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(30,45,74,0.12)",
                    minWidth: "260px",
                    zIndex: 20,
                    padding: "14px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#7a90aa",
                      fontFamily: "Times New Roman",
                    }}
                  >
                    Siųsti publikaciją
                  </p>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Vartotojo vardas"
                    value={shareUsername}
                    onChange={(e) => setShareUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleShare()}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      border: "1px solid #c8d4e3",
                      fontFamily: "Times New Roman",
                      fontSize: "13px",
                      color: "#1e2d4a",
                      outline: "none",
                      boxSizing: "border-box",
                      marginBottom: "8px",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#1e2d4a")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#c8d4e3")
                    }
                  />
                  <input
                    type="text"
                    placeholder="Žinutė (neprivaloma)"
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      border: "1px solid #c8d4e3",
                      fontFamily: "Times New Roman",
                      fontSize: "13px",
                      color: "#1e2d4a",
                      outline: "none",
                      boxSizing: "border-box",
                      marginBottom: "10px",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#1e2d4a")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#c8d4e3")
                    }
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={handleShare}
                      disabled={sharing || !shareUsername.trim()}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        background:
                          sharing || !shareUsername.trim()
                            ? "#eef1f6"
                            : "#1e2d4a",
                        color:
                          sharing || !shareUsername.trim()
                            ? "#7a90aa"
                            : "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        cursor:
                          sharing || !shareUsername.trim()
                            ? "not-allowed"
                            : "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      {sharing ? "Siunčiama..." : "Siųsti"}
                    </button>
                    <button
                      onClick={() => setShareOpen(false)}
                      style={{
                        padding: "6px 12px",
                        background: "none",
                        border: "1px solid #dce3ed",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "13px",
                        color: "#7a90aa",
                      }}
                    >
                      Atšaukti
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: "1px", background: "#eef1f6" }} />

          {pub.authors?.length > 0 && (
            <div style={metaStyle}>
              <span style={labelStyle}>{t.authors}:</span>{" "}
              {pub.authors.join(", ")}
            </div>
          )}
          {pub.institutions?.length > 0 && (
            <div style={metaStyle}>
              <InstitutionsList
                institutions={pub.institutions}
                highlightName={institutionName}
              />
            </div>
          )}
          {pub.source_name && (
            <div style={metaStyle}>
              <span style={labelStyle}>{t.source}:</span> {pub.source_name}
            </div>
          )}

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {pub.year && (
              <div style={metaStyle}>
                <span style={labelStyle}>{t.year}:</span> {pub.year}
              </div>
            )}
            {(pub.type || pub.pub_type) && (
              <div style={metaStyle}>
                <span style={labelStyle}>{t.type_label}:</span>{" "}
                {pub.type || pub.pub_type}
              </div>
            )}
            {pub.language && (
              <div style={metaStyle}>
                <span style={labelStyle}>{t.language}:</span>{" "}
                {pub.language.toUpperCase()}
              </div>
            )}
            {pub.cited_by_count != null && (
              <div style={metaStyle}>
                <span style={labelStyle}>{t.citations}:</span>{" "}
                {pub.cited_by_count}
              </div>
            )}
            {pub.is_oa != null && (
              <div style={metaStyle}>
                <span style={labelStyle}>{t.open_access_label}:</span>{" "}
                <span style={{ color: pub.is_oa ? "#2a7050" : "#7a90aa" }}>
                  {pub.is_oa ? t.yes : t.no}
                </span>
              </div>
            )}
          </div>

          {pub.keywords?.length > 0 && (
            <div>
              <div style={{ ...metaStyle, marginBottom: "8px" }}>
                <span style={labelStyle}>{t.keywords}:</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {pub.keywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      padding: "2px 10px",
                      borderRadius: "20px",
                      background: "#eef1f6",
                      border: "1px solid #dce3ed",
                      fontSize: "12px",
                      color: "#1e2d4a",
                      fontFamily: "Times New Roman",
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
              <div style={{ ...metaStyle, marginBottom: "6px" }}>
                <span style={labelStyle}>{t.abstract}:</span>
              </div>
              <p
                style={{
                  margin: 0,
                  lineHeight: "1.6",
                  color: "#5a7090",
                  fontSize: "13px",
                  fontFamily: "Times New Roman",
                }}
              >
                {pub.abstract}
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {pub.doi && (
              <div style={metaStyle}>
                <span style={labelStyle}>DOI:</span>{" "}
                <a
                  href={pub.doi}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2a5db0" }}
                >
                  {pub.doi}
                </a>
              </div>
            )}
            {pub.pdf_url && (
              <a
                href={pub.pdf_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "13px",
                  color: "#2a5db0",
                  fontFamily: "Times New Roman",
                }}
              >
                {t.open_pdf} ↗
              </a>
            )}
          </div>
        </div>

        {pub.id && <PublicationNotes pubId={pub.id} />}
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

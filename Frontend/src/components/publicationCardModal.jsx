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
      <strong>{t.institutions}:</strong>{" "}
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
                color: "#514f58",
                cursor: "pointer",
                padding: 0,
                fontFamily: "Times New Roman",
                fontSize: "15px",
                textDecoration: "underline",
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
          background: "#e8e8e8",
          marginBottom: "16px",
        }}
      />
      <strong style={{ fontFamily: "Times New Roman", fontSize: "15px" }}>
        Pastabos
      </strong>

      {loading ? (
        <p style={{ color: "#aaaaaa", fontSize: "13px", marginTop: "8px" }}>
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
                background: "#fafaf7",
                border: "0.5px solid #d6d4cc",
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
                      border: "0.5px solid #bbb",
                      fontFamily: "Times New Roman",
                      fontSize: "14px",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => handleUpdate(note.id)}
                      style={{
                        padding: "3px 12px",
                        background: "#1a1a1a",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "13px",
                      }}
                    >
                      Išsaugoti
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        padding: "3px 12px",
                        background: "none",
                        color: "#888",
                        border: "0.5px solid #ccc",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "13px",
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
                      fontSize: "14px",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                      color: "#2a2535",
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
                        border: "0.5px solid #ccc",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "12px",
                        color: "#666",
                      }}
                    >
                      Redaguoti
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      style={{
                        padding: "2px 8px",
                        background: "none",
                        border: "0.5px solid #ccc",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "12px",
                        color: "#999",
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
                  color: "#bbb",
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
                borderRadius: "8px",
                border: "0.5px solid #cacaca",
                fontFamily: "Times New Roman",
                fontSize: "14px",
                resize: "vertical",
                outline: "none",
                color: "#333",
                boxSizing: "border-box",
                background: "#fafaf7",
              }}
            />
            {newText.trim() && (
              <button
                onClick={handleCreate}
                disabled={saving}
                style={{
                  alignSelf: "flex-end",
                  padding: "4px 14px",
                  background: saving ? "#a39f9f" : "#1a1a1a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "14px",
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
  const { showToast } = useToast();

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
                color: "#ffffff",
              }}
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
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: "1px solid #7f7a88",
                  background: "#000000",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "15px",
                  opacity: saving ? 0.7 : 1,
                  color: "#fff",
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
                      {t.no_projects_dropdown}
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
                                  color: "#888",
                                  fontSize: "14px",
                                }}
                              >
                                {t.loading}
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleSaveToFolder(null)}
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
                                    borderBottom: "1px solid #eee",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    fontFamily: "Times New Roman",
                                    fontSize: "14px",
                                    color: "#525050",
                                    boxSizing: "border-box",
                                    fontStyle: "italic",
                                  }}
                                >
                                  Išsaugoti pačiame projekte
                                </button>

                                {folders.length === 0 ? (
                                  <div
                                    style={{
                                      padding: "10px 16px",
                                      color: "#888",
                                      fontSize: "14px",
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
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                          "#f0eef4")
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                          "none")
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
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {pub.authors?.length > 0 && (
            <div>
              <strong>{t.authors}:</strong> {pub.authors.join(", ")}
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
              <strong>{t.source}:</strong> {pub.source_name}
            </div>
          )}

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {pub.year && (
              <div>
                <strong>{t.year}:</strong> {pub.year}
              </div>
            )}
            {pub.type && (
              <div>
                <strong>{t.type_label}:</strong> {pub.type}
              </div>
            )}
            {pub.language && (
              <div>
                <strong>{t.language}:</strong> {pub.language.toUpperCase()}
              </div>
            )}
            {pub.cited_by_count != null && (
              <div>
                <strong>{t.citations}:</strong> {pub.cited_by_count}
              </div>
            )}
            {pub.is_oa != null && (
              <div>
                <strong>{t.open_access_label}:</strong>{" "}
                {pub.is_oa ? t.yes : t.no}
              </div>
            )}
          </div>

          {pub.keywords?.length > 0 && (
            <div>
              <strong>{t.keywords}:</strong>
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
                      color: "#000000",
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
              <strong>{t.abstract}:</strong>
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
                {t.open_page}
              </a>
            )}
            {pub.pdf_url && (
              <a href={pub.pdf_url} target="_blank" rel="noreferrer">
                {t.open_pdf}
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

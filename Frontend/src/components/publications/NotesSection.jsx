import { useState } from "react";
import { errorMessage } from "../../api/client";
import { createNote, deleteNote, listNotes, updateNote } from "../../api/projects";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { Loading } from "../ui/Feedback";

const MAX_LENGTH = 5000;

function NoteItem({ note, onSave, onDelete }) {
  const { t, formatDate } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const ok = await onSave(note, text.trim());
    setBusy(false);
    if (ok) setEditing(false);
  };

  return (
    <div className="note">
      {editing ? (
        <div className="stack-sm">
          <textarea
            className="textarea"
            value={text}
            maxLength={MAX_LENGTH}
            autoFocus
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) save();
              if (event.key === "Escape") {
                event.stopPropagation();
                setEditing(false);
                setText(note.text);
              }
            }}
          />
          <div className="row">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !text.trim()} onClick={save}>
              {t("common.save")}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditing(false);
                setText(note.text);
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <p className="pre-wrap small">{note.text}</p>
      )}
      <div className="row-between" style={{ marginTop: 6 }}>
        <span className="tiny muted">
          {note.author?.username ? `${note.author.username} · ` : ""}
          {formatDate(note.created_at)}
          {note.updated_at && note.updated_at !== note.created_at && new Date(note.updated_at) - new Date(note.created_at) > 60_000
            ? ` · ${t("notes.edited")}`
            : ""}
        </span>
        {note.can_edit && !editing && (
          <div className="row">
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}>
              {t("common.edit")}
            </button>
            <button type="button" className="btn btn-ghost btn-xs" style={{ color: "var(--danger)" }} onClick={() => onDelete(note)}>
              {t("common.delete")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Shared notes of a saved publication. */
export default function NotesSection({ projectId, publicationId, canEdit, onChanged }) {
  const { t } = useLanguage();
  const showToast = useToast();
  const confirm = useConfirm();
  const notes = useQuery(`notes:${projectId}:${publicationId}`, () => listNotes(projectId, publicationId));
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const update = (updater) => {
    notes.setData((current = []) => updater(current));
    onChanged?.();
  };

  const add = async () => {
    if (!draft.trim()) return;
    setAdding(true);
    try {
      const note = await createNote(projectId, publicationId, draft.trim());
      update((current) => [...current, note]);
      setDraft("");
    } catch (error) {
      showToast(errorMessage(error, t, "notes.failed"));
    } finally {
      setAdding(false);
    }
  };

  const save = async (note, text) => {
    try {
      const updated = await updateNote(projectId, publicationId, note.id, text);
      update((current) => current.map((item) => (item.id === note.id ? updated : item)));
      return true;
    } catch (error) {
      showToast(errorMessage(error, t, "notes.failed"));
      return false;
    }
  };

  const remove = async (note) => {
    const ok = await confirm({ title: t("notes.delete_title"), message: t("notes.delete_message"), confirmLabel: t("common.delete") });
    if (!ok) return;
    try {
      await deleteNote(projectId, publicationId, note.id);
      update((current) => current.filter((item) => item.id !== note.id));
    } catch (error) {
      showToast(errorMessage(error, t, "notes.failed"));
    }
  };

  return (
    <section className="stack-sm">
      <h3 className="section-title">{t("notes.title")}</h3>
      {notes.loading && !notes.data ? (
        <Loading label={t("common.loading")} />
      ) : (
        <>
          {(notes.data || []).length === 0 && <p className="small muted">{t("notes.empty")}</p>}
          {(notes.data || []).map((note) => (
            <NoteItem key={note.id} note={note} onSave={save} onDelete={remove} />
          ))}
        </>
      )}
      {canEdit && (
        <div className="stack-sm">
          <label className="visually-hidden" htmlFor={`note-${publicationId}`}>
            {t("notes.add")}
          </label>
          <textarea
            id={`note-${publicationId}`}
            className="textarea"
            rows={2}
            value={draft}
            maxLength={MAX_LENGTH}
            placeholder={t("notes.placeholder")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) add();
            }}
          />
          <div className="row-between">
            <span className="tiny subtle">{t("notes.shortcut")}</span>
            <button type="button" className="btn btn-primary btn-sm" disabled={adding || !draft.trim()} onClick={add}>
              {adding ? t("common.saving") : t("notes.add")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../../api/client";
import {
  createFolder,
  deleteFolder,
  deletePublication,
  getFolder,
  listFolders,
  listPublications,
  updateFolder,
  updatePublication,
} from "../../api/projects";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { LABELS, authorsLine } from "../../utils/publication";
import LabelPicker from "../publications/LabelPicker";
import PublicationModal from "../publications/PublicationModal";
import Dropdown from "../ui/Dropdown";
import { Alert, EmptyState, Loading } from "../ui/Feedback";
import Icon from "../ui/Icon";
import Pagination from "../ui/Pagination";
import FolderPickerModal from "./FolderPickerModal";

const PAGE_SIZE = 50;
const SORTS = ["saved_desc", "saved_asc", "year_desc", "year_asc", "citations_desc", "title"];

function Breadcrumb({ crumbs, onNavigate }) {
  const { t } = useLanguage();
  const items = [{ id: null, name: t("library.root") }, ...crumbs];
  return (
    <nav className="breadcrumb" aria-label={t("library.breadcrumb")}>
      {items.map((crumb, index) => {
        const last = index === items.length - 1;
        return (
          <span key={crumb.id ?? "root"} className="row" style={{ gap: 4 }}>
            {last ? (
              <span className="current" aria-current="page">{crumb.name}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(crumb.id)}>{crumb.name}</button>
            )}
            {!last && <span className="sep">›</span>}
          </span>
        );
      })}
    </nav>
  );
}

function FolderRow({ folder, canEdit, onOpen, onRename, onDelete }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);

  if (editing) {
    return (
      <form
        className="list-row row"
        onSubmit={async (event) => {
          event.preventDefault();
          if (name.trim() && name.trim() !== folder.name && (await onRename(folder, name.trim()))) setEditing(false);
          else if (name.trim() === folder.name) setEditing(false);
        }}
      >
        <Icon name="folder" className="folder-icon" />
        <input
          className="input input-sm"
          autoFocus
          value={name}
          maxLength={255}
          aria-label={t("library.folder_name")}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setEditing(false);
              setName(folder.name);
            }
          }}
        />
        <button type="submit" className="btn btn-primary btn-sm">{t("common.save")}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setName(folder.name); }}>
          {t("common.cancel")}
        </button>
      </form>
    );
  }

  return (
    <div className="list-row list-row-folder">
      <button type="button" className="row" style={{ flex: 1, minWidth: 0, background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }} onClick={() => onOpen(folder.id)}>
        <Icon name="folder" className="folder-icon" size={18} />
        <span className="list-row-main">
          <span className="strong truncate">{folder.name}</span>
          <span className="tiny muted">
            {[folder.subfolder_count > 0 && t.count("library.subfolders", folder.subfolder_count), t.count("library.publications", folder.publication_count)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </button>
      {canEdit && (
        <Dropdown
          align="end"
          label={<Icon name="more" />}
          buttonClassName="btn btn-ghost btn-icon btn-sm"
          buttonProps={{ "aria-label": t("library.folder_actions", { name: folder.name }) }}
        >
          {({ close }) => (
            <>
              <button type="button" className="menu-item" onClick={() => { close(); setEditing(true); }}>
                <Icon name="edit" /> {t("library.rename")}
              </button>
              <button type="button" className="menu-item" onClick={() => { close(); onDelete(folder, true); }}>
                <Icon name="folder" /> {t("library.delete_keep")}
              </button>
              <button type="button" className="menu-item is-danger" onClick={() => { close(); onDelete(folder, false); }}>
                <Icon name="trash" /> {t("library.delete_all")}
              </button>
            </>
          )}
        </Dropdown>
      )}
      <Icon name="chevronRight" className="subtle" />
    </div>
  );
}

function PublicationRow({ project, publication, canEdit, onOpen, onChanged, onMove, onRemove }) {
  const { t } = useLanguage();
  const firstNote = publication.notes?.[0];
  return (
    <div className="list-row">
      <div className="list-row-main">
        <button type="button" className="list-row-title" onClick={() => onOpen(publication)}>
          {publication.title}
        </button>
        <span className="small muted">
          {[authorsLine(publication.authors, 3, t("common.et_al")), publication.year, publication.source_name].filter(Boolean).join(" · ")}
        </span>
        <div className="row-wrap" style={{ gap: 6 }}>
          <LabelPicker projectId={project.id} publication={publication} canEdit={canEdit} onChange={onChanged} />
          {publication.is_retracted && <span className="chip chip-danger">{t("publication.retracted")}</span>}
          {publication.notes?.length > 0 && (
            <span className="chip"><Icon name="edit" size={11} /> {t.count("library.notes", publication.notes.length)}</span>
          )}
        </div>
        {firstNote && <span className="note-preview truncate">“{firstNote.text}”</span>}
      </div>
      {canEdit && (
        <Dropdown
          align="end"
          label={<Icon name="more" />}
          buttonClassName="btn btn-ghost btn-icon btn-sm"
          buttonProps={{ "aria-label": t("library.publication_actions") }}
        >
          {({ close }) => (
            <>
              <button type="button" className="menu-item" onClick={() => { close(); onOpen(publication); }}>
                <Icon name="file" /> {t("library.open")}
              </button>
              <button type="button" className="menu-item" onClick={() => { close(); onMove(publication); }}>
                <Icon name="folder" /> {t("move.button")}
              </button>
              <button type="button" className="menu-item is-danger" onClick={() => { close(); onRemove(publication); }}>
                <Icon name="trash" /> {t("common.remove")}
              </button>
            </>
          )}
        </Dropdown>
      )}
    </div>
  );
}

/** Folders and publications of the current folder (or the project root). */
export default function LibraryPane({ project, folderId, onNavigate, externalVersion, onChanged }) {
  const { t } = useLanguage();
  const showToast = useToast();
  const confirm = useConfirm();
  const canEdit = project.role === "owner" || project.role === "editor";
  const [version, setVersion] = useState(0);
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [sort, setSort] = useState("saved_desc");
  const [page, setPage] = useState(1);
  const [newFolder, setNewFolder] = useState(null);
  const [openPublication, setOpenPublication] = useState(null);
  const [moving, setMoving] = useState(null);
  const q = useDebouncedValue(text.trim(), 300);
  const scope = `${project.id}:${folderId || "root"}:${version}:${externalVersion}`;

  const folder = useQuery(folderId ? `folder:${scope}` : null, () => getFolder(project.id, folderId));
  const subfolders = useQuery(`subfolders:${scope}`, () => listFolders(project.id, folderId));
  const publications = useQuery(`publications:${scope}:${q}:${label}:${sort}:${page}`, () =>
    listPublications(project.id, { folder: folderId || "root", q: q || undefined, label: label || undefined, sort, page, page_size: PAGE_SIZE }),
  );
  const pubData = publications.data || publications.previousData;

  const refresh = () => {
    setVersion((value) => value + 1);
    onChanged?.();
  };

  const run = async (action, fallbackKey) => {
    try {
      await action();
      refresh();
      return true;
    } catch (error) {
      showToast(errorMessage(error, t, fallbackKey));
      return false;
    }
  };

  const submitNewFolder = async (event) => {
    event.preventDefault();
    if (!newFolder?.trim()) return;
    if (await run(() => createFolder(project.id, newFolder.trim(), folderId), "library.folder_failed")) setNewFolder(null);
  };

  const removeFolder = async (target, keepPublications) => {
    const ok = await confirm({
      title: t("library.delete_folder_title", { name: target.name }),
      message: t(keepPublications ? "library.delete_keep_message" : "library.delete_all_message"),
      confirmLabel: t("common.delete"),
    });
    if (ok) run(() => deleteFolder(project.id, target.id, keepPublications), "library.folder_failed");
  };

  const removePublication = async (publication) => {
    const ok = await confirm({
      title: t("publication.remove_title"),
      message: t("publication.remove_message", { title: publication.title }),
      confirmLabel: t("common.remove"),
    });
    if (ok) run(() => deletePublication(project.id, publication.id), "publication.remove_failed");
  };

  const filtersActive = Boolean(q || label);
  const empty = !subfolders.loading && !publications.loading && (subfolders.data || []).length === 0 && pubData?.count === 0;

  return (
    <div className="stack">
      <div className="row-between">
        <Breadcrumb crumbs={folder.data?.breadcrumb || []} onNavigate={onNavigate} />
        {canEdit && newFolder === null && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewFolder("")}>
            <Icon name="folderPlus" /> {t("library.new_folder")}
          </button>
        )}
      </div>

      {newFolder !== null && (
        <form className="row" onSubmit={submitNewFolder}>
          <input
            className="input input-sm"
            autoFocus
            maxLength={255}
            value={newFolder}
            placeholder={t("library.folder_name")}
            aria-label={t("library.folder_name")}
            onChange={(event) => setNewFolder(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setNewFolder(null);
              }
            }}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!newFolder.trim()}>{t("common.create")}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewFolder(null)}>{t("common.cancel")}</button>
        </form>
      )}

      {subfolders.error && <Alert>{errorMessage(subfolders.error, t)}</Alert>}
      {(subfolders.data || []).length > 0 && (
        <section className="stack-sm" aria-label={t("library.folders")}>
          {subfolders.data.map((item) => (
            <FolderRow
              key={item.id}
              folder={item}
              canEdit={canEdit}
              onOpen={onNavigate}
              onRename={(target, name) => run(() => updateFolder(project.id, target.id, { name }), "library.folder_failed")}
              onDelete={removeFolder}
            />
          ))}
        </section>
      )}

      <section className="stack-sm" aria-label={t("library.publications_title")}>
        <div className="library-toolbar">
          <input
            className="input input-sm"
            type="search"
            value={text}
            placeholder={t("library.filter_placeholder")}
            aria-label={t("library.filter_placeholder")}
            onChange={(event) => {
              setText(event.target.value);
              setPage(1);
            }}
          />
          <select className="select select-sm" value={label} aria-label={t("library.filter_label")} onChange={(event) => { setLabel(event.target.value); setPage(1); }}>
            <option value="">{t("library.all_labels")}</option>
            {LABELS.map((code) => (
              <option key={code} value={code}>{t(`labels.${code}`)}</option>
            ))}
            <option value="none">{t("library.no_label")}</option>
          </select>
          <select className="select select-sm" value={sort} aria-label={t("search.sort")} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
            {SORTS.map((value) => (
              <option key={value} value={value}>{t(`library.sort_${value}`)}</option>
            ))}
          </select>
        </div>

        {publications.error && <Alert>{errorMessage(publications.error, t)}</Alert>}
        {!pubData && publications.loading && <Loading label={t("common.loading")} />}

        {empty && !filtersActive && (
          <EmptyState icon="book" title={t(folderId ? "library.empty_folder_title" : "library.empty_title")} action={
            <Link className="btn btn-primary btn-sm" to="/">
              <Icon name="search" /> {t("library.find_publications")}
            </Link>
          }>
            {t(folderId ? "library.empty_folder" : "library.empty")}
          </EmptyState>
        )}
        {pubData && pubData.count === 0 && filtersActive && <p className="small muted">{t("library.no_matches")}</p>}

        {pubData && (
          <div style={{ opacity: publications.loading ? 0.55 : 1, transition: "opacity .15s" }}>
            {pubData.count > 0 && <p className="tiny muted" style={{ marginBottom: 6 }}>{t.count("library.publications", pubData.count)}</p>}
            {pubData.results.map((publication) => (
              <PublicationRow
                key={publication.id}
                project={project}
                publication={publication}
                canEdit={canEdit}
                onOpen={setOpenPublication}
                onChanged={refresh}
                onMove={setMoving}
                onRemove={removePublication}
              />
            ))}
            <Pagination page={page} totalPages={Math.ceil(pubData.count / PAGE_SIZE)} onChange={setPage} disabled={publications.loading} />
          </div>
        )}
      </section>

      {openPublication && (
        <PublicationModal
          open
          onClose={() => setOpenPublication(null)}
          saved={{ projectId: project.id, role: project.role, publication: openPublication }}
          onSavedChange={refresh}
        />
      )}
      {moving && (
        <FolderPickerModal
          open
          onClose={() => setMoving(null)}
          projectId={project.id}
          currentFolderId={moving.folder_id}
          onPick={async (target) => {
            if (await run(() => updatePublication(project.id, moving.id, { folder_id: target }), "move.failed")) {
              showToast(t("move.done"), "success");
              setMoving(null);
            }
          }}
        />
      )}
    </div>
  );
}

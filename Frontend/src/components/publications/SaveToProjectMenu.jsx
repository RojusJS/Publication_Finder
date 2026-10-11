import { useState } from "react";
import { errorMessage } from "../../api/client";
import { getFolderTree, savePublications } from "../../api/projects";
import { useAuth } from "../../context/AuthContext";
import { useProjects } from "../../context/ProjectsContext";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useT } from "../../i18n/LanguageContext";
import Dropdown from "../ui/Dropdown";
import { Spinner } from "../ui/Feedback";
import Icon from "../ui/Icon";

function FolderTargets({ project, onPick, busy }) {
  const t = useT();
  const tree = useQuery(`folder-tree:${project.id}`, () => getFolderTree(project.id));

  if (tree.loading) {
    return (
      <div className="menu-empty row">
        <Spinner /> {t("common.loading")}
      </div>
    );
  }
  return (
    <>
      <button type="button" className="menu-item" disabled={busy} onClick={() => onPick(null)}>
        <Icon name="book" />
        <span className="truncate">{t("save.project_root")}</span>
      </button>
      {(tree.data || []).map((folder) => (
        <button
          key={folder.id}
          type="button"
          className="menu-item"
          disabled={busy}
          style={{ paddingLeft: 10 + Math.min(folder.depth, 6) * 14 }}
          onClick={() => onPick(folder.id)}
        >
          <Icon name="folder" />
          <span className="truncate">{folder.name}</span>
        </button>
      ))}
      {tree.error && <div className="menu-empty">{errorMessage(tree.error, t)}</div>}
    </>
  );
}

function SaveMenuContent({ openalexIds, onSaved, close }) {
  const t = useT();
  const showToast = useToast();
  const { editableProjects, openCreateDialog, reload: reloadProjects } = useProjects();
  const [expanded, setExpanded] = useState(editableProjects.length === 1 ? editableProjects[0].id : null);
  const [busy, setBusy] = useState(false);

  const save = async (project, folderId) => {
    setBusy(true);
    try {
      const result = await savePublications(project.id, openalexIds, folderId);
      const saved = result.saved.length;
      const already = result.skipped.filter((item) => item.reason === "already_saved").length;
      const missing = result.skipped.length - already;
      const parts = [];
      if (saved) parts.push(t.count("save.saved", saved, { project: project.name }));
      if (already) parts.push(t.count("save.already", already));
      if (missing) parts.push(t.count("save.not_found", missing));
      showToast(parts.join(" "), saved ? "success" : "info");
      if (saved) reloadProjects();
      onSaved?.(result, project);
      close();
    } catch (error) {
      showToast(errorMessage(error, t, "save.failed"));
    } finally {
      setBusy(false);
    }
  };

  if (editableProjects.length === 0) {
    return (
      <div className="stack-sm" style={{ padding: 10, maxWidth: 260 }}>
        <span className="small muted">{t("save.no_projects")}</span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            close();
            openCreateDialog();
          }}
        >
          <Icon name="plus" /> {t("projects.create")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="menu-header section-title">{t("save.choose_target")}</div>
      {editableProjects.map((project) => (
        <div key={project.id}>
          <button
            type="button"
            className={`menu-item ${expanded === project.id ? "is-active" : ""}`}
            aria-expanded={expanded === project.id}
            onClick={() => setExpanded(expanded === project.id ? null : project.id)}
          >
            <Icon name={expanded === project.id ? "chevronDown" : "chevronRight"} />
            <span className="truncate strong">{project.name}</span>
          </button>
          {expanded === project.id && (
            <div style={{ paddingLeft: 12 }}>
              <FolderTargets project={project} busy={busy} onPick={(folderId) => save(project, folderId)} />
            </div>
          )}
        </div>
      ))}
      {busy && (
        <div className="menu-empty row">
          <Spinner /> {t("save.saving")}
        </div>
      )}
    </>
  );
}

/** "Save to project" button + menu, used everywhere a publication can be saved. */
export default function SaveToProjectMenu({
  openalexIds,
  onSaved,
  label,
  buttonClassName = "btn btn-secondary btn-sm",
  align = "start",
  disabled = false,
}) {
  const t = useT();
  const { isAuthenticated, openAuth } = useAuth();
  const content = label ?? (
    <>
      <Icon name="bookmark" /> {t("save.button")}
    </>
  );

  if (!isAuthenticated) {
    return (
      <button type="button" className={buttonClassName} onClick={() => openAuth("login")} title={t("save.login_required")}>
        {content}
      </button>
    );
  }

  return (
    <Dropdown label={content} buttonClassName={buttonClassName} align={align} disabled={disabled || !openalexIds?.length} width={300}>
      {({ close }) => <SaveMenuContent openalexIds={openalexIds} onSaved={onSaved} close={close} />}
    </Dropdown>
  );
}

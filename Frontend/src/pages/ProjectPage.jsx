import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { errorCode, errorMessage } from "../api/client";
import { deleteProject, exportProject, getProject, leaveProject, updateProject } from "../api/projects";
import InsightsPanel from "../components/projects/InsightsPanel";
import LibraryPane from "../components/projects/LibraryPane";
import MembersModal from "../components/projects/MembersModal";
import OverviewPanel from "../components/projects/OverviewPanel";
import ProjectFormModal from "../components/projects/ProjectFormModal";
import ProjectSearchPanel from "../components/projects/ProjectSearchPanel";
import RecommendationsPanel from "../components/projects/RecommendationsPanel";
import Dropdown from "../components/ui/Dropdown";
import { Alert, EmptyState, Loading } from "../components/ui/Feedback";
import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useProjects } from "../context/ProjectsContext";
import { useToast } from "../context/ToastContext";
import useQuery from "../hooks/useQuery";
import { useLanguage } from "../i18n/LanguageContext";
import { downloadBlob } from "../utils/download";

const TABS = [
  { id: "overview", icon: "chart" },
  { id: "recommendations", icon: "sparkles" },
  { id: "search", icon: "search" },
  { id: "insights", icon: "lightbulb" },
];
const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "bibtex", label: "BibTeX (.bib)" },
  { id: "ris", label: "RIS (Zotero, Mendeley, EndNote)" },
  { id: "csv", label: "CSV (Excel)" },
];

function ExportMenu({ project, folderId }) {
  const { t } = useLanguage();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (format, scopeFolder, close) => {
    close();
    setBusy(true);
    try {
      const { blob, filename } = await exportProject(project.id, format, scopeFolder);
      downloadBlob(blob, filename);
    } catch (error) {
      showToast(errorMessage(error, t, "export.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dropdown
      align="end"
      disabled={busy}
      label={
        <>
          <Icon name="download" /> {busy ? t("export.preparing") : t("export.button")}
        </>
      }
    >
      {({ close }) => (
        <>
          <div className="menu-header section-title">{t("export.whole_project")}</div>
          {EXPORT_FORMATS.map((format) => (
            <button key={format.id} type="button" className="menu-item" onClick={() => run(format.id, null, close)}>
              {format.label}
            </button>
          ))}
          {folderId && (
            <>
              <div className="menu-divider" />
              <div className="menu-header section-title">{t("export.this_folder")}</div>
              {EXPORT_FORMATS.map((format) => (
                <button key={format.id} type="button" className="menu-item" onClick={() => run(format.id, folderId, close)}>
                  {format.label}
                </button>
              ))}
            </>
          )}
        </>
      )}
    </Dropdown>
  );
}

function ProjectView({ project, onProjectChange }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const showToast = useToast();
  const { upsert, remove, reload: reloadProjects } = useProjects();
  const [params, setParams] = useSearchParams();
  const folderId = params.get("folder") || null;
  const tab = TABS.some((item) => item.id === params.get("tab")) ? params.get("tab") : "overview";
  const [scope, setScope] = useState("project");
  const [dialog, setDialog] = useState(null);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [statsVersion, setStatsVersion] = useState(0);
  const isOwner = project.role === "owner";
  const toolFolder = folderId && scope === "folder" ? folderId : null;

  const setParam = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next);
  };

  const save = async (payload) => {
    const updated = await updateProject(project.id, payload);
    onProjectChange(updated);
    upsert(updated);
    setDialog(null);
    showToast(t("projects.saved"), "success");
  };

  const destroy = async () => {
    const ok = await confirm({
      title: t("projects.delete_title"),
      message: t("projects.delete_message", { name: project.name }),
      confirmLabel: t("projects.delete"),
    });
    if (!ok) return;
    try {
      await deleteProject(project.id);
      remove(project.id);
      showToast(t("projects.deleted", { name: project.name }), "success");
      navigate("/");
    } catch (error) {
      showToast(errorMessage(error, t));
    }
  };

  const leave = async () => {
    const ok = await confirm({
      title: t("projects.leave_title"),
      message: t("projects.leave_message", { name: project.name }),
      confirmLabel: t("projects.leave"),
    });
    if (!ok) return;
    try {
      await leaveProject(project.id);
      remove(project.id);
      navigate("/");
    } catch (error) {
      showToast(errorMessage(error, t));
    }
  };

  return (
    <div className="project-page">
      <header className="project-header">
        <div className="stack-sm" style={{ minWidth: 0, flex: "1 1 320px" }}>
          <div className="row-wrap">
            <h1 className="project-title">{project.name}</h1>
            <span className="chip">{t(`roles.${project.role}`)}</span>
            {!isOwner && <span className="small muted">{t("projects.owned_by", { user: project.owner })}</span>}
          </div>
          {project.description && <p className="small muted pre-wrap">{project.description}</p>}
        </div>
        <div className="row-wrap">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog("members")}>
            <Icon name="users" /> {t("projects.members")} {project.member_count > 0 && <span className="muted">({project.member_count + 1})</span>}
          </button>
          {isOwner && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog("edit")}>
              <Icon name="edit" /> {t("common.edit")}
            </button>
          )}
          <ExportMenu project={project} folderId={folderId} />
          {isOwner ? (
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={destroy}>
              <Icon name="trash" /> {t("projects.delete")}
            </button>
          ) : (
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={leave}>
              <Icon name="logout" /> {t("projects.leave")}
            </button>
          )}
        </div>
      </header>

      <div className="project-panes">
        <section className="pane pane-library" aria-label={t("library.title")}>
          <LibraryPane
            key={folderId || "root"}
            project={project}
            folderId={folderId}
            externalVersion={libraryVersion}
            onNavigate={(id) => setParam("folder", id)}
            onChanged={() => {
              setStatsVersion((value) => value + 1);
              reloadProjects();
            }}
          />
        </section>

        <section className="pane pane-tools" aria-label={t("projects.tools")}>
          <div className="tabs" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className="tab"
                aria-selected={tab === item.id}
                onClick={() => setParam("tab", item.id === "overview" ? null : item.id)}
              >
                <Icon name={item.icon} size={15} /> {t(`projects.tab_${item.id}`)}
              </button>
            ))}
          </div>
          {folderId && (
            <div className="scope-bar">
              <span className="small muted">{t("projects.scope")}</span>
              <div className="segmented" role="group" aria-label={t("projects.scope")}>
                <button type="button" aria-pressed={scope === "project"} onClick={() => setScope("project")}>
                  {t("projects.scope_project")}
                </button>
                <button type="button" aria-pressed={scope === "folder"} onClick={() => setScope("folder")}>
                  {t("projects.scope_folder")}
                </button>
              </div>
            </div>
          )}
          <div role="tabpanel">
            {tab === "overview" && <OverviewPanel project={project} folderId={toolFolder} version={statsVersion} />}
            {tab === "recommendations" && (
              <RecommendationsPanel
                key={toolFolder || "all"}
                project={project}
                folderId={toolFolder}
                onLibraryChanged={() => {
                  setLibraryVersion((value) => value + 1);
                  setStatsVersion((value) => value + 1);
                }}
              />
            )}
            {tab === "search" && <ProjectSearchPanel key={toolFolder || "all"} project={project} folderId={toolFolder} />}
            {tab === "insights" && <InsightsPanel key={toolFolder || "all"} project={project} folderId={toolFolder} />}
          </div>
        </section>
      </div>

      <MembersModal open={dialog === "members"} onClose={() => setDialog(null)} project={project} />
      <ProjectFormModal open={dialog === "edit"} onClose={() => setDialog(null)} project={project} onSubmit={save} />
    </div>
  );
}

export default function ProjectPage() {
  const { t } = useLanguage();
  const { projectId } = useParams();
  const { status, user, openAuth } = useAuth();
  const id = /^\d+$/.test(projectId || "") ? projectId : null;
  const query = useQuery(user && id ? `project:${user.id}:${id}` : null, () => getProject(id));
  const [override, setOverride] = useState(null);
  const project = override && override.id === query.data?.id ? override : query.data;

  if (status === "loading") return <Loading label={t("common.loading")} />;
  if (status === "anonymous") {
    return (
      <div className="page">
        <EmptyState icon="user" title={t("projects.login_required_title")} action={<button type="button" className="btn btn-primary" onClick={() => openAuth("login")}>{t("auth.login")}</button>}>
          {t("projects.login_required")}
        </EmptyState>
      </div>
    );
  }
  if (!id || errorCode(query.error) === "project_not_found") {
    return (
      <div className="page">
        <EmptyState icon="folder" title={t("projects.not_found_title")} action={<Link className="btn btn-primary" to="/">{t("common.back_to_search")}</Link>}>
          {t("projects.not_found")}
        </EmptyState>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="page">
        <Alert>
          {errorMessage(query.error, t)}{" "}
          <button type="button" className="link-button" onClick={query.reload}>{t("common.retry")}</button>
        </Alert>
      </div>
    );
  }
  if (!project) return <Loading label={t("common.loading")} />;
  return <ProjectView key={project.id} project={project} onProjectChange={setOverride} />;
}

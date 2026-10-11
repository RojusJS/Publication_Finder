import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useProjects } from "../../context/ProjectsContext";
import { useT } from "../../i18n/LanguageContext";
import { Spinner } from "../ui/Feedback";
import Icon from "../ui/Icon";

export default function Sidebar({ open, onNavigate }) {
  const t = useT();
  const { status, isAuthenticated, openAuth } = useAuth();
  const { projects, loading, openCreateDialog } = useProjects();
  const linkClass = ({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`;

  return (
    <nav className={`sidebar ${open ? "is-open" : ""}`} aria-label={t("sidebar.navigation")}>
      <NavLink to="/" end className={linkClass} onClick={onNavigate}>
        <Icon name="search" /> {t("sidebar.search")}
      </NavLink>

      <div className="sidebar-section-title">
        <span>{t("sidebar.projects")}</span>
        {isAuthenticated && (
          <button
            type="button"
            className="btn btn-on-dark btn-icon btn-sm"
            aria-label={t("projects.create")}
            title={t("projects.create")}
            onClick={() => {
              openCreateDialog();
              onNavigate?.();
            }}
          >
            <Icon name="plus" size={14} />
          </button>
        )}
      </div>

      {status === "anonymous" && (
        <div className="stack-sm sidebar-note">
          <span>{t("sidebar.login_prompt")}</span>
          <button type="button" className="btn btn-light btn-sm" onClick={() => openAuth("login")}>
            {t("auth.login")}
          </button>
        </div>
      )}

      {isAuthenticated && loading && (
        <div className="sidebar-note row">
          <Spinner onDark /> {t("common.loading")}
        </div>
      )}

      {isAuthenticated && !loading && projects.length === 0 && (
        <div className="stack-sm sidebar-note">
          <span>{t("sidebar.no_projects")}</span>
          <button type="button" className="btn btn-light btn-sm" onClick={openCreateDialog}>
            <Icon name="plus" /> {t("projects.create")}
          </button>
        </div>
      )}

      <div className="stack-sm" style={{ gap: 2 }}>
        {projects.map((project) => (
          <NavLink key={project.id} to={`/projects/${project.id}`} className={linkClass} onClick={onNavigate}>
            <Icon name="folder" />
            <span className="sidebar-link-body">
              <span className="truncate">{project.name}</span>
              <span className="sidebar-link-meta truncate">
                {project.role === "owner"
                  ? t.count("sidebar.publication_count", project.publication_count)
                  : t("sidebar.shared_by", { user: project.owner })}
              </span>
            </span>
            {project.role !== "owner" && <span className="sidebar-tag">{t(`roles.${project.role}`)}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

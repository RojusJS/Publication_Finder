import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { createProject } from "../../api/projects";
import { useProjects } from "../../context/ProjectsContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../i18n/LanguageContext";
import AuthModal from "../auth/AuthModal";
import ProjectFormModal from "../projects/ProjectFormModal";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const t = useT();
  const navigate = useNavigate();
  const showToast = useToast();
  const { createDialogOpen, closeCreateDialog, upsert } = useProjects();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const create = async (payload) => {
    const project = await createProject(payload);
    upsert(project);
    closeCreateDialog();
    showToast(t("projects.created", { name: project.name }), "success");
    navigate(`/projects/${project.id}`);
  };

  return (
    <>
      <a href="#main" className="visually-hidden">{t("app.skip_to_content")}</a>
      <AppHeader sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="app-body">
        <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        <div className={`sidebar-backdrop ${sidebarOpen ? "is-open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <main id="main" className="main">
          <Outlet />
        </main>
      </div>
      <AuthModal />
      <ProjectFormModal open={createDialogOpen} onClose={closeCreateDialog} onSubmit={create} />
    </>
  );
}

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { listProjects } from "../api/projects";
import useQuery from "../hooks/useQuery";
import { useAuth } from "./AuthContext";

const ProjectsContext = createContext(null);

export function ProjectsProvider({ children }) {
  const { user } = useAuth();
  const query = useQuery(user ? `projects:${user.id}` : null, listProjects);
  const { setData, reload } = query;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const upsert = useCallback(
    (project) =>
      setData((current = []) => {
        const exists = current.some((item) => item.id === project.id);
        return exists ? current.map((item) => (item.id === project.id ? { ...item, ...project } : item)) : [project, ...current];
      }),
    [setData],
  );
  const remove = useCallback((projectId) => setData((current = []) => current.filter((item) => item.id !== projectId)), [setData]);

  const value = useMemo(() => {
    const projects = user ? query.data ?? [] : [];
    return {
      projects,
      editableProjects: projects.filter((project) => project.role === "owner" || project.role === "editor"),
      loading: Boolean(user) && query.loading && query.data === undefined,
      reload,
      upsert,
      remove,
      createDialogOpen,
      openCreateDialog: () => setCreateDialogOpen(true),
      closeCreateDialog: () => setCreateDialogOpen(false),
    };
  }, [user, query.data, query.loading, reload, upsert, remove, createDialogOpen]);

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error("useProjects must be used inside ProjectsProvider");
  return context;
}

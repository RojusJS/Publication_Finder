import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { ProjectsProvider } from "./context/ProjectsContext";
import { ToastProvider } from "./context/ToastContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import NotFoundPage from "./pages/NotFoundPage";
import ProjectPage from "./pages/ProjectPage";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <ProjectsProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route index element={<SearchPage />} />
                    <Route path="projects/:projectId" element={<ProjectPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </ProjectsProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}

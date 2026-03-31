import { useState } from "react";
import React from "react";
import ProjectModal from "./savedPublicationsModal.jsx";
import { useLanguage } from "./language";

function ProjectsBar({
  onCreateProjectClick,
  isLoggedIn,
  projects,
  onProjectDeleted,
}) {
  const [selectedProject, setSelectedProject] = useState(null);
  const { t } = useLanguage();
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        width: "240px",
        minWidth: "240px",
        padding: "20px 16px",
        boxSizing: "border-box",
        fontFamily: "Times New Roman",
        background: "#f3f3f307",
        borderRight: "0.5px solid #ddd9e3",
      }}
    >
      <p
        style={{
          margin: "0 0 16px",
          fontSize: "11px",
          fontWeight: "500",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#000000",
          fontFamily: "Times New Roman",
        }}
      >
        {t.projects}
      </p>

      <button
        onClick={onCreateProjectClick}
        disabled={!isLoggedIn}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: isLoggedIn ? "#e2e2e2" : "#dadada",
          border: "0.5px solid #979797",
          borderRadius: "8px",
          cursor: isLoggedIn ? "pointer" : "not-allowed",
          fontFamily: "Times New Roman",
          fontSize: "14px",
          color: isLoggedIn ? "#000000" : "#aaa",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
        onMouseEnter={(e) => {
          if (isLoggedIn) e.currentTarget.style.background = "#d4d4d4";
        }}
        onMouseLeave={(e) => {
          if (isLoggedIn) e.currentTarget.style.background = "#e6e5e5";
        }}
      >
        <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
        {t.create_project}
      </button>

      {!isLoggedIn && (
        <p
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "#aaa",
            fontFamily: "sans-serif",
          }}
        >
          {t.login_to_create}
        </p>
      )}

      <div
        style={{
          marginTop: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {projects.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "#aaa",
              fontFamily: "sans-serif",
            }}
          >
            {t.no_projects}
          </p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#ebebeb")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "transparent",
                cursor: "pointer",
                transition: "background 0.1s",
                border: "0.5px solid #979797",
                marginBottom: "8px"
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#2a2535",
                  fontFamily: "Times New Roman",
                }}
              >
                {project.name}
              </p>
              {project.description && (
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "12px",
                    color: "#9993a8",
                    fontFamily: "sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {project.description}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <ProjectModal
        open={selectedProject !== null}
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onProjectDeleted={onProjectDeleted}
      />
    </div>
  );
}

export default ProjectsBar;

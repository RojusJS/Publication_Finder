import React from "react";
import { useLanguage } from "./language";

function ProjectsBar({
  onCreateProjectClick,
  isLoggedIn,
  projects,
  onProjectDeleted,
  onProjectClick,
  activeProjectId,
}) {
  const { t } = useLanguage();
  const currentUsername = localStorage.getItem("username") || "";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        width: "220px",
        minWidth: "220px",
        padding: "20px 12px 24px 16px",
        boxSizing: "border-box",
        fontFamily: "Times New Roman",
        background: "#1e2d4a",
        borderRight: "none",
      }}
    >
      <p
        style={{
          margin: "0 0 14px 4px",
          fontSize: "10px",
          fontWeight: "700",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {t.projects}
      </p>

      <button
        onClick={onCreateProjectClick}
        disabled={!isLoggedIn}
        style={{
          width: "100%",
          padding: "7px 12px",
          background: "rgba(255,255,255,0.07)",
          border: "1px dashed rgba(255,255,255,0.2)",
          borderRadius: "7px",
          cursor: isLoggedIn ? "pointer" : "not-allowed",
          fontFamily: "Times New Roman",
          fontSize: "13px",
          color: isLoggedIn ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "7px",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (isLoggedIn) {
            e.currentTarget.style.background = "rgba(255,255,255,0.13)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
          }
        }}
        onMouseLeave={(e) => {
          if (isLoggedIn) {
            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          }
        }}
      >
        <span
          style={{
            fontSize: "15px",
            lineHeight: 1,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          +
        </span>
        {t.create_project}
      </button>

      {!isLoggedIn && (
        <p
          style={{
            marginTop: "8px",
            fontSize: "11px",
            color: "rgba(255,255,255,0.3)",
            fontFamily: "sans-serif",
            paddingLeft: "4px",
          }}
        >
          {t.login_to_create}
        </p>
      )}

      <div
        style={{
          marginTop: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {projects.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "rgba(255,255,255,0.3)",
              fontFamily: "sans-serif",
              paddingLeft: "4px",
            }}
          >
            {t.no_projects}
          </p>
        ) : (
          projects.map((project) => {
            const isActive = project.id === activeProjectId;
            const isShared = project.owner && project.owner !== currentUsername;

            return (
              <div
                key={project.id}
                onClick={() => onProjectClick(project)}
                style={{
                  padding: "9px 10px 9px 12px",
                  borderRadius: "7px",
                  background: isActive ? "rgba(255,255,255,0.12)" : "#899eb452",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  borderLeft: isActive
                    ? "3px solid #7fa8d4"
                    : "3px solid transparent",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#899eb452";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    justifyContent: "space-between",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      fontWeight: isActive ? "600" : "400",
                      color: isActive ? "#ffffff" : "rgba(255,255,255,0.75)",
                      fontFamily: "Times New Roman",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {project.name}
                  </p>
                  {isShared && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: "700",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#7fa8d4",
                        background: "rgba(127,168,212,0.15)",
                        border: "1px solid rgba(127,168,212,0.3)",
                        borderRadius: "4px",
                        padding: "1px 5px",
                        flexShrink: 0,
                        fontFamily: "sans-serif",
                      }}
                    >
                      Bendras
                    </span>
                  )}
                </div>
                {isShared && project.owner && (
                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.35)",
                      fontFamily: "sans-serif",
                    }}
                  >
                    {project.owner}
                  </p>
                )}
                {!isShared && project.description && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.35)",
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
            );
          })
        )}
      </div>
    </div>
  );
}

export default ProjectsBar;

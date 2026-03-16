import { useState } from "react";
import React from "react";
import ProjectModal from "./savedPublicationsModal.jsx";

function ProjectsBar({ onCreateProjectClick, isLoggedIn, projects, onProjectDeleted }) {
  const [selectedProject, setSelectedProject] = useState(null);
  return (
    <div
      style={{
        width: "260px",
        minWidth: "260px",
        borderRight: "2px solid #acacac",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily: "Times New Roman",
        background: "#f1f0f3",
        minHeight: "calc(100vh - 73px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.20)",
        borderRadius: "10px",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Projektai</h3>

      <button
        onClick={onCreateProjectClick}
        disabled={!isLoggedIn}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: isLoggedIn ? "#e4e3e3" : "#c0bfbf",
          border: "2px solid #000000",
          borderRadius: "12px",
          cursor: isLoggedIn ? "pointer" : "not-allowed",
          fontFamily: "Times New Roman",
          fontSize: "16px",
        }}
      >
        Sukurti projektą
      </button>

      {!isLoggedIn && (
        <p style={{ marginTop: "10px", fontSize: "14px", color: "#727272" }}>
          Norėdami kurti projektus, prisijunkite
        </p>
      )}

      <div style={{ marginTop: "20px" }}>
        {projects.length === 0 ? (
          <p style={{ margin: 0, color: "#666" }}>Projektų dar nėra</p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                style={{
                  border: "2px solid #4e4e4e",
                  borderRadius: "10px",
                  padding: "10px",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#dfdfdf")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#ffffff")
                }
              >
                <strong>{project.name}</strong>
                <p
                  style={{
                    margin: "6px 0 0 0",
                    fontSize: "14px",
                    color: "#555",
                  }}
                >
                  {project.description || "Aprašymo nėra"}
                </p>
              </div>
            ))}
          </div>
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

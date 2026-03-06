import React from "react";

function ProjectsBar({ onCreateProjectClick, isLoggedIn, projects }) {
  return (
    <div
      style={{
        width: "260px",
        minWidth: "260px",
        borderRight: "1px solid #c9c9c9",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily: "Times New Roman",
        background: "#c2bbca",
        minHeight: "calc(100vh - 73px)",
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
          <p style={{ margin: 0, color: "#666" }}>
            Projektų dar nėra
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  border: "2px solid #8d56a3",
                  borderRadius: "10px",
                  padding: "10px",
                  background: "#ffffff",
                }}
              >
                <strong>{project.name}</strong>
                <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#555" }}>
                  {project.description || "Aprašymo nėra"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectsBar;
import React from "react";
import Modal from "./modal";
import CitationGraph from "./citationGraph";

function CitationGraphModal({ open, onClose, pub, projects = [] }) {
  if (!pub) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Citavimo grafas: ${pub.title}`}
      maxWidth="1200px"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          fontFamily: "Times New Roman",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#666",
          }}
        >
          Rodomos publikacijos, kurios cituoja pasirinktą publikacija
        </p>

        {pub.openalex_id ? (
          <CitationGraph pub={pub} projects={projects} />
        ) : (
          <p
            style={{
              fontSize: "14px",
              color: "#888",
              margin: 0,
            }}
          >
            Citavimo grafikas nepasiekiamas
          </p>
        )}
      </div>
    </Modal>
  );
}

export default CitationGraphModal;
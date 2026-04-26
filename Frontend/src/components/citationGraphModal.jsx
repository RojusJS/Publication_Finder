import React from "react";
import Modal from "./modal";
import CitationGraph from "./citationGraph";
import { useLanguage } from "./language";

function CitationGraphModal({ open, onClose, pub, projects = [] }) {
  const { t } = useLanguage();
  if (!pub) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t.citation_graph_title}: ${pub.title}`}
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
        <p style={{ margin: 0, fontSize: "13px", color: "#7a90aa" }}>
          {t.citation_graph_desc}
        </p>
        {pub.openalex_id ? (
          <CitationGraph pub={pub} projects={projects} />
        ) : (
          <p style={{ fontSize: "13px", color: "#7a90aa", margin: 0 }}>
            {t.citation_graph_unavailable}
          </p>
        )}
      </div>
    </Modal>
  );
}

export default CitationGraphModal;

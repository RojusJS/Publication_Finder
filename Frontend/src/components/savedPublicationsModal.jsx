import Modal from "./modal";

function SavedPublicationsModal({ open, project, onClose }) {
  if (!project) return null;

  return (
    <Modal open={open} title={project.name} onClose={onClose} maxWidth="1200px">
      <p style={{ color: "#5e5d5d", marginTop: 0 }}>
        {project.description || "Aprašymo nėra"}
      </p>
      <p style={{ color: "#969595", fontSize: "14px" }}>
        Išsaugotų publikacijų dar nėra
      </p>
    </Modal>
  );
}

export default SavedPublicationsModal;
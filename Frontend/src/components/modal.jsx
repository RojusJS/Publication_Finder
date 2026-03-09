function Modal({ open, title, children, onClose, maxWidth }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.70)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: "auto",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: maxWidth ?? "500px",
          background: "#ffffff",
          borderRadius: "20px",
          border: "2px solid #000000",
          padding: "20px",
          boxSizing: "border-box",
          fontFamily: "Times New Roman",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "1px solid #000000",
              background: "#eb1d1da2",
              borderRadius: "8px",
              cursor: "pointer",
              padding: "4px 10px",
              height: "32px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: "10px" }}>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
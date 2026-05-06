import { useState, useEffect } from "react";
import Modal from "./modal";
import { useLanguage } from "./language";
import { useToast } from "./toastContext";
import {
  getCollaborators,
  inviteCollaborator,
  removeCollaborator,
} from "../services/projectApi";

function CollaboratorsModal({ open, onClose, project }) {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const { showToast } = useToast();

  const currentUsername = localStorage.getItem("username") || "";

  useEffect(() => {
    if (open && project) {
      setLoading(true);
      getCollaborators(project.id)
        .then(setCollaborators)
        .catch(() => showToast("Nepavyko gauti narių"))
        .finally(() => setLoading(false));
    }
  }, [open, project]);

  useEffect(() => {
    if (!open) {
      setInviteUsername("");
      setInviteRole("editor");
      setInviting(false);
    }
  }, [open]);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviting(true);
    try {
      const collab = await inviteCollaborator(
        project.id,
        inviteUsername.trim(),
        inviteRole,
      );
      setCollaborators((prev) => [...prev, collab]);
      setInviteUsername("");
      showToast("Pakvietimas išsiųstas", "success");
    } catch {
      showToast("Nepavyko pakviesti vartotojo");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = (collabId, username) => {
    removeCollaborator(project.id, collabId)
      .then(() => {
        setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
        showToast(`${username} pašalintas iš projekto`, "success");
      })
      .catch(() => showToast("Nepavyko pašalinti nario"));
  };

  const isOwner =
    collaborators.some(
      (c) => c.role === "owner" && c.user?.username === currentUsername,
    ) || project?.owner === currentUsername;

  const statusBadge = (status) => {
    const map = {
      accepted: { label: "Aktyvus", bg: "#e8f5ec", color: "#1e6640" },
      pending: { label: "Laukiama", bg: "#fef9e7", color: "#6b5200" },
      declined: { label: "Atmesta", bg: "#fdecea", color: "#922b21" },
    };
    return map[status] || map.declined;
  };

  const roleLabel = (role) => {
    if (role === "owner") return "Savininkas";
    if (role === "editor") return "Redaktorius";
    return "Stebėtojas";
  };

  return (
    <Modal open={open} onClose={onClose} title="Nariai" maxWidth="520px">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#7a90aa",
              fontFamily: "Times New Roman",
            }}
          >
            Pakviesti narį
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="Vartotojo vardas"
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "6px",
                border: "1px solid #c8d4e3",
                fontFamily: "Times New Roman",
                fontSize: "13px",
                outline: "none",
                color: "#1e2d4a",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: "6px",
                border: "1px solid #c8d4e3",
                fontFamily: "Times New Roman",
                fontSize: "12px",
                color: "#1e2d4a",
                outline: "none",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              <option value="editor">Redaktorius</option>
              <option value="viewer">Stebėtojas</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteUsername.trim()}
              style={{
                padding: "7px 16px",
                background:
                  inviting || !inviteUsername.trim() ? "#eef1f6" : "#1e2d4a",
                color:
                  inviting || !inviteUsername.trim() ? "#7a90aa" : "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor:
                  inviting || !inviteUsername.trim()
                    ? "not-allowed"
                    : "pointer",
                fontFamily: "Times New Roman",
                fontSize: "13px",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              {inviting ? "..." : "Pakviesti"}
            </button>
          </div>
        </div>

        <div style={{ height: "1px", background: "#eef1f6" }} />

        <div>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#7a90aa",
              fontFamily: "Times New Roman",
            }}
          >
            Narių sąrašas
          </p>
          {loading ? (
            <p
              style={{
                color: "#7a90aa",
                fontSize: "13px",
                fontFamily: "Times New Roman",
              }}
            >
              Kraunama...
            </p>
          ) : collaborators.length === 0 ? (
            <p
              style={{
                color: "#7a90aa",
                fontSize: "13px",
                fontFamily: "Times New Roman",
              }}
            >
              Nėra narių
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {collaborators.map((c) => {
                const isMe = c.user.username === currentUsername;
                const isOwnerEntry = c.role === "owner";
                const st = !isOwnerEntry ? statusBadge(c.status) : null;
                return (
                  <div
                    key={c.id ?? `owner-${c.user.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      border: `1px solid ${isMe ? "#7fa8d4" : "#dce3ed"}`,
                      borderRadius: "8px",
                      background: isMe ? "#f7f9fc" : "#ffffff",
                      fontFamily: "Times New Roman",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1e2d4a",
                          }}
                        >
                          {c.user.username}
                          {isMe ? " (aš)" : ""}
                        </span>
                        {st && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              background: st.bg,
                              color: st.color,
                              padding: "1px 7px",
                              borderRadius: "10px",
                              fontFamily: "sans-serif",
                            }}
                          >
                            {st.label}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "11px", color: "#7a90aa" }}>
                        {roleLabel(c.role)}
                      </span>
                    </div>
                    {!isOwnerEntry && isOwner && (
                      <button
                        onClick={() => handleRemove(c.id, c.user.username)}
                        style={{
                          padding: "3px 10px",
                          background: "none",
                          border: "1px solid #dce3ed",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontFamily: "Times New Roman",
                          fontSize: "12px",
                          color: "#7a90aa",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#c0392b";
                          e.currentTarget.style.color = "#c0392b";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#dce3ed";
                          e.currentTarget.style.color = "#7a90aa";
                        }}
                      >
                        Pašalinti
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default CollaboratorsModal;

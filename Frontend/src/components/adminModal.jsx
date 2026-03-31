import Modal from "./modal";
import { useState, useEffect } from "react";
import { getUsers, deleteUser } from "../services/authenticationApi";

function AdminModal({ open, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) handleOpen();
  }, [open]);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      alert("Nepavyko gauti vartotojų");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Ištrinti vartotoją "${username}"?`)) return;
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      alert("Nepavyko ištrinti vartotojo");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Vartotojai" maxWidth="600px">
      {loading && <p style={{ color: "#979696" }}>Kraunama...</p>}
      {!loading && users.length === 0 && (
        <p style={{ color: "#888", fontSize: "14px" }}>Vartotojų nėra</p>
      )}
      {!loading && users.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                border: "0.5px solid #9e9e9e",
                borderRadius: "8px",
                fontFamily: "Times New Roman",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "2px" }}
              >
                <span style={{ fontSize: "15px", fontWeight: "500" }}>
                  {user.username}
                </span>
                <span style={{ fontSize: "12px", color: "#838282" }}>
                  {user.email}
                </span>
                <span style={{ fontSize: "11px", color: "#afaeae" }}>
                  Užsiregistravo:{" "}
                  {new Date(user.date_joined).toLocaleDateString("lt-LT")}
                </span>
              </div>
              <button
                onClick={() => handleDeleteUser(user.id, user.username)}
                style={{
                  padding: "4px 10px",
                  background: "#e72525a2",
                  border: "1px solid #000000",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                }}
              >
                Ištrinti
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default AdminModal;

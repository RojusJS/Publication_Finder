import Modal from "./modal";
import { useState, useEffect } from "react";
import {
  getUsers,
  deleteUser,
  toggleUserStaff,
} from "../services/authenticationApi";
import { useLanguage } from "./language";
import { useToast } from "./toastContext";

function AdminModal({ open, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      handleOpen();
    }
  }, [open]);

  const handleOpen = async () => {
    setLoading(true);

    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      showToast("Nepavyko gauti vartotojų");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`${t.delete_confirm_user} "${username}"?`)) return;

    try {
      await deleteUser(userId);

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast("Vartotojas ištrintas", "success");
    } catch {
      showToast("Nepavyko ištrinti vartotojo");
    }
  };

  const handleToggleStaff = async (userId) => {
    try {
      const data = await toggleUserStaff(userId);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_staff: data.is_staff } : u,
        ),
      );

      showToast(
        `${data.username} ${
          data.is_staff
            ? "paskirtas administratoriumi"
            : "pašalintas iš administratorių"
        }`,
        "success",
      );
    } catch {
      showToast("Nepavyko pakeisti rolės");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t.users} maxWidth="680px">
      {loading && (
        <p
          style={{
            color: "#7a90aa",
            fontFamily: "Times New Roman",
            fontSize: "13px",
          }}
        >
          {t.loading}
        </p>
      )}

      {!loading && users.length === 0 && (
        <p
          style={{
            color: "#7a90aa",
            fontSize: "13px",
            fontFamily: "Times New Roman",
          }}
        >
          {t.no_users}
        </p>
      )}

      {!loading && users.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                border: "1px solid #dce3ed",
                borderRadius: "8px",
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "12px 14px",
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
                      {user.username}
                    </span>

                    {user.is_staff && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          background: "#eef1f6",
                          color: "#1e2d4a",
                          padding: "1px 7px",
                          borderRadius: "10px",
                          letterSpacing: "0.06em",
                          fontFamily: "sans-serif",
                          border: "1px solid #dce3ed",
                        }}
                      >
                        ADMIN
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: "12px", color: "#7a90aa" }}>
                    {user.email}
                  </span>

                  <span style={{ fontSize: "11px", color: "#7a90aa" }}>
                    {t.registered}:{" "}
                    {new Date(user.date_joined).toLocaleDateString("lt-LT")}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      marginTop: "6px",
                    }}
                  >
                    {[
                      { label: "Projektai", value: user.project_count ?? 0 },
                      {
                        label: "Publikacijos",
                        value: user.publication_count ?? 0,
                      },
                      { label: "Paieškos", value: user.search_count ?? 0 },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "4px 10px",
                          background: "#f7f9fc",
                          borderRadius: "6px",
                          border: "1px solid #eef1f6",
                          minWidth: "60px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#1e2d4a",
                          }}
                        >
                          {value}
                        </span>

                        <span
                          style={{
                            fontSize: "9px",
                            color: "#7a90aa",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            fontFamily: "sans-serif",
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    alignItems: "flex-end",
                  }}
                >
                  <button
                    onClick={() => handleToggleStaff(user.id)}
                    style={{
                      padding: "4px 12px",
                      background: "none",
                      border: "1px solid #dce3ed",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      fontSize: "12px",
                      color: user.is_staff ? "#c0392b" : "#5a7090",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = user.is_staff
                        ? "#c0392b"
                        : "#1e2d4a";
                      e.currentTarget.style.color = user.is_staff
                        ? "#c0392b"
                        : "#1e2d4a";
                      e.currentTarget.style.background = user.is_staff
                        ? "#fff0ee"
                        : "#f0f4fa";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#dce3ed";
                      e.currentTarget.style.color = user.is_staff
                        ? "#c0392b"
                        : "#5a7090";
                      e.currentTarget.style.background = "none";
                    }}
                  >
                    {user.is_staff
                      ? "Pašalinti iš adminų"
                      : "Skirti administratoriumi"}
                  </button>

                  <button
                    onClick={() => handleDeleteUser(user.id, user.username)}
                    style={{
                      padding: "4px 12px",
                      background: "none",
                      border: "1px solid #dce3ed",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontFamily: "Times New Roman",
                      fontSize: "12px",
                      color: "#c0392b",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#c0392b";
                      e.currentTarget.style.background = "#fff0ee";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#dce3ed";
                      e.currentTarget.style.background = "none";
                    }}
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default AdminModal;

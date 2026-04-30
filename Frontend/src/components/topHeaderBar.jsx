import { useState, useEffect, useRef } from "react";
import AdminModal from "./adminModal";
import { useLanguage } from "./language";
import {
  getPendingInvitations,
  respondInvitation,
  getSharedPublications,
  markSharedPublicationViewed,
} from "../services/projectApi";
import PublicationCardModal from "./publicationCardModal";

function HeaderBar({
  isLoggedIn,
  onLogin,
  onRegister,
  onLogout,
  onInvitationAccepted,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  const [sharedPubs, setSharedPubs] = useState([]);
  const [sharedPubsOpen, setSharedPubsOpen] = useState(false);
  const [selectedSharedPub, setSelectedSharedPub] = useState(null);
  const [sharedPubModalOpen, setSharedPubModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setInvitationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setPendingInvitations([]);
      setSharedPubs([]);
      return;
    }
    fetchInvitations();
    fetchSharedPubs();
    const interval = setInterval(() => {
      fetchInvitations();
      fetchSharedPubs();
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const fetchInvitations = async () => {
    try {
      const data = await getPendingInvitations();
      setPendingInvitations(data);
    } catch {}
  };

  const fetchSharedPubs = async () => {
    try {
      const data = await getSharedPublications();
      setSharedPubs(data.filter((s) => !s.viewed));
    } catch {}
  };

  const handleRespond = async (collabId, action) => {
    setRespondingId(collabId);
    try {
      await respondInvitation(collabId, action);
      setPendingInvitations((prev) => prev.filter((i) => i.id !== collabId));
      if (action === "accept") {
        onInvitationAccepted?.();
      }
    } catch {}
    setRespondingId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    localStorage.removeItem("is_staff");
    setDropdownOpen(false);
    setInvitationsOpen(false);
    setSharedPubsOpen(false);
    setPendingInvitations([]);
    setSharedPubs([]);
    onLogout?.();
  };

  const isAdmin = localStorage.getItem("is_staff") === "true";
  const username = localStorage.getItem("username") || "";
  const hasPending = pendingInvitations.length > 0 || sharedPubs.length > 0;
  const totalNotifications = pendingInvitations.length + sharedPubs.length;

  return (
    <>
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          height: "52px",
          background: "#1e2d4a",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 100,
        }}
      >
        <div style={{ width: "200px", display: "flex", alignItems: "center" }}>
          <button
            onClick={() => setLang(lang === "LT" ? "EN" : "LT")}
            style={{
              padding: "4px 10px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "Times New Roman",
              fontSize: "12px",
              color: "rgba(255,255,255,0.8)",
              letterSpacing: "0.06em",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.18)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
          >
            {lang}
          </button>
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "Times New Roman",
            fontSize: "16px",
            fontWeight: "400",
            color: "#ffffff",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          {t.search_title}
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {!isLoggedIn ? (
            <>
              <button
                onClick={onLogin}
                style={{
                  padding: "5px 14px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.85)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {t.login}
              </button>
              <button
                onClick={onRegister}
                style={{
                  padding: "5px 14px",
                  background: "#ffffff",
                  border: "1px solid #ffffff",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  color: "#1e2d4a",
                  fontWeight: "600",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#e8eef7")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#ffffff")
                }
              >
                {t.register}
              </button>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                {username}
              </span>

              {isAdmin && (
                <button
                  onClick={() => setAdminOpen(true)}
                  style={{
                    padding: "4px 12px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontFamily: "Times New Roman",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.18)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                  }
                >
                  {t.users}
                </button>
              )}

              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setDropdownOpen((prev) => !prev);
                    setInvitationsOpen(false);
                  }}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    border: hasPending
                      ? "2px solid #f59e0b"
                      : "1.5px solid rgba(255,255,255,0.4)",
                    background: dropdownOpen
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.12)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Times New Roman",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#ffffff",
                    position: "relative",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = dropdownOpen
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.12)")
                  }
                >
                  {username.charAt(0).toUpperCase() || "U"}
                  {hasPending && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: "#f59e0b",
                        border: "2px solid #1e2d4a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "8px",
                        fontWeight: "700",
                        color: "#1e2d4a",
                        lineHeight: 1,
                      }}
                    >
                      {totalNotifications}
                    </span>
                  )}
                </button>

                {dropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "38px",
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #dce3ed",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(30,45,74,0.15)",
                      minWidth: "180px",
                      zIndex: 1000,
                      overflow: "hidden",
                    }}
                  >
                    {pendingInvitations.length > 0 && (
                      <button
                        onClick={() => {
                          setInvitationsOpen(true);
                          setSharedPubsOpen(false);
                          setDropdownOpen(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #eef1f6",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "Times New Roman",
                          fontSize: "13px",
                          color: "#1e2d4a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f0f4fa")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "none")
                        }
                      >
                        <span>Pakvietimai</span>
                        <span
                          style={{
                            background: "#f59e0b",
                            color: "#1e2d4a",
                            borderRadius: "10px",
                            padding: "1px 7px",
                            fontSize: "11px",
                            fontWeight: "700",
                          }}
                        >
                          {pendingInvitations.length}
                        </span>
                      </button>
                    )}
                    {sharedPubs.length > 0 && (
                      <button
                        onClick={() => {
                          setSharedPubsOpen(true);
                          setInvitationsOpen(false);
                          setDropdownOpen(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #eef1f6",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "Times New Roman",
                          fontSize: "13px",
                          color: "#1e2d4a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f0f4fa")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "none")
                        }
                      >
                        <span>Gautos publikacijos</span>
                        <span
                          style={{
                            background: "#f59e0b",
                            color: "#1e2d4a",
                            borderRadius: "10px",
                            padding: "1px 7px",
                            fontSize: "11px",
                            fontWeight: "700",
                          }}
                        >
                          {sharedPubs.length}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "13px",
                        color: "#1e2d4a",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f0f4fa")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      {t.logout}
                    </button>
                  </div>
                )}

                {invitationsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "38px",
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #dce3ed",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(30,45,74,0.15)",
                      minWidth: "300px",
                      zIndex: 1000,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        borderBottom: "1px solid #eef1f6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#1e2d4a",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontFamily: "Times New Roman",
                        }}
                      >
                        Pakvietimai
                      </span>
                      <button
                        onClick={() => setInvitationsOpen(false)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#7a90aa",
                          fontSize: "13px",
                          padding: 0,
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#1e2d4a")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#7a90aa")
                        }
                      >
                        ✕
                      </button>
                    </div>

                    {pendingInvitations.length === 0 ? (
                      <div
                        style={{
                          padding: "16px 14px",
                          color: "#7a90aa",
                          fontSize: "13px",
                          fontFamily: "Times New Roman",
                        }}
                      >
                        Nėra laukiančių pakvietimų
                      </div>
                    ) : (
                      pendingInvitations.map((inv) => (
                        <div
                          key={inv.id}
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #eef1f6",
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 2px",
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "#1e2d4a",
                              fontFamily: "Times New Roman",
                            }}
                          >
                            {inv.project_name}
                          </p>
                          <p
                            style={{
                              margin: "0 0 10px",
                              fontSize: "12px",
                              color: "#7a90aa",
                              fontFamily: "Times New Roman",
                            }}
                          >
                            Pakvietė: {inv.invited_by} ·{" "}
                            {inv.role === "editor"
                              ? "Redaktorius"
                              : "Stebėtojas"}
                          </p>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleRespond(inv.id, "accept")}
                              disabled={respondingId === inv.id}
                              style={{
                                padding: "4px 14px",
                                background: "#1e2d4a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontFamily: "Times New Roman",
                                fontSize: "12px",
                                fontWeight: "600",
                                opacity: respondingId === inv.id ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#2a3f63")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "#1e2d4a")
                              }
                            >
                              Priimti
                            </button>
                            <button
                              onClick={() => handleRespond(inv.id, "decline")}
                              disabled={respondingId === inv.id}
                              style={{
                                padding: "4px 14px",
                                background: "none",
                                color: "#c0392b",
                                border: "1px solid #dce3ed",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontFamily: "Times New Roman",
                                fontSize: "12px",
                                opacity: respondingId === inv.id ? 0.6 : 1,
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
                              Atmesti
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {sharedPubsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "38px",
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #dce3ed",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(30,45,74,0.15)",
                      minWidth: "320px",
                      zIndex: 1000,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        borderBottom: "1px solid #eef1f6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#1e2d4a",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontFamily: "Times New Roman",
                        }}
                      >
                        Gautos publikacijos
                      </span>
                      <button
                        onClick={() => setSharedPubsOpen(false)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#7a90aa",
                          fontSize: "13px",
                          padding: 0,
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#1e2d4a")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#7a90aa")
                        }
                      >
                        ✕
                      </button>
                    </div>
                    {sharedPubs.length === 0 ? (
                      <div
                        style={{
                          padding: "16px 14px",
                          color: "#7a90aa",
                          fontSize: "13px",
                          fontFamily: "Times New Roman",
                        }}
                      >
                        Nėra naujų publikacijų
                      </div>
                    ) : (
                      sharedPubs.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #eef1f6",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f7f9fc")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                          onClick={async () => {
                            await markSharedPublicationViewed(s.id);
                            setSharedPubs((prev) =>
                              prev.filter((p) => p.id !== s.id),
                            );
                            setSelectedSharedPub(s.publication_data);
                            setSharedPubsOpen(false);
                            setSharedPubModalOpen(true);
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 3px",
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "#1e2d4a",
                              fontFamily: "Times New Roman",
                              lineHeight: "1.3",
                            }}
                          >
                            {s.publication_data?.title?.length > 60
                              ? s.publication_data.title.slice(0, 60) + "..."
                              : s.publication_data?.title}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "11px",
                              color: "#7a90aa",
                              fontFamily: "Times New Roman",
                            }}
                          >
                            Siuntė: {s.sender?.username}{" "}
                            {s.message && `· „${s.message}"`}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
      <PublicationCardModal
        open={sharedPubModalOpen}
        onClose={() => {
          setSharedPubModalOpen(false);
          setSelectedSharedPub(null);
        }}
        pub={selectedSharedPub}
        institutionName={null}
        projects={[]}
      />
    </>
  );
}

export default HeaderBar;

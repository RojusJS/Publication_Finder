import { useState, useEffect, useRef } from "react";
import AdminModal from "./adminModal";
import { useLanguage } from "./language";

function HeaderBar({ isLoggedIn, onLogin, onRegister, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    localStorage.removeItem("is_staff");
    setDropdownOpen(false);
    onLogout?.();
  };

  const isAdmin = localStorage.getItem("is_staff") === "true";
  const username = localStorage.getItem("username") || "";

  return (
    <>
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          height: "52px",
          borderBottom: "1px solid #d8d8d8",
          boxSizing: "border-box",
          background: "#ffffff",
          position: "relative",
          zIndex: 100,
        }}
      >
        <div style={{ width: "200px", display: "flex", alignItems: "center" }}>
          <button
            onClick={() => setLang(lang === "LT" ? "EN" : "LT")}
            style={{
              padding: "4px 10px",
              background: "none",
              border: "1px solid #cccccc",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "Times New Roman",
              fontSize: "13px",
              color: "#444444",
              letterSpacing: "0.04em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#888888")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#cccccc")}
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
            color: "#111111",
            letterSpacing: "0.02em",
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
                  background: "none",
                  border: "1px solid #cccccc",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  color: "#333333",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f5f5f5")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                {t.login}
              </button>
              <button
                onClick={onRegister}
                style={{
                  padding: "5px 14px",
                  background: "#111111",
                  border: "1px solid #111111",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontFamily: "Times New Roman",
                  fontSize: "13px",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#333333")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#111111")
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
                  color: "#555555",
                }}
              >
                {username}
              </span>

              {isAdmin && (
                <button
                  onClick={() => setAdminOpen(true)}
                  style={{
                    padding: "4px 12px",
                    background: "none",
                    border: "1px solid #cccccc",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontFamily: "Times New Roman",
                    fontSize: "13px",
                    color: "#333333",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f5f5f5")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  {t.users}
                </button>
              )}

              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    border: "1px solid #cccccc",
                    background: dropdownOpen ? "#ebebeb" : "#f5f5f5",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Times New Roman",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#333333",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#ebebeb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = dropdownOpen
                      ? "#ebebeb"
                      : "#f5f5f5")
                  }
                >
                  {username.charAt(0).toUpperCase() || "U"}
                </button>

                {dropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "38px",
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #d0d0d0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      minWidth: "130px",
                      zIndex: 1000,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        padding: "9px 14px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "13px",
                        color: "#222222",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f5f5f5")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      {t.logout}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  );
}

export default HeaderBar;

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
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    border: "1.5px solid rgba(255,255,255,0.4)",
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
                      minWidth: "130px",
                      zIndex: 1000,
                      overflow: "hidden",
                    }}
                  >
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

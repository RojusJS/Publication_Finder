import { useState, useEffect, useRef } from "react";
import AdminModal from "./adminModal";

function HeaderBar({ isLoggedIn, onLogin, onRegister, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  return (
    <>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "2px solid #1b1b1b",
          boxSizing: "border-box",
          background: "#ffffff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ fontFamily: "Times New Roman" }}>
          <h2 style={{ margin: 0 }}>Publikacijų paieška</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!isLoggedIn ? (
            <>
              <button
                onClick={onLogin}
                style={{
                  padding: "8px 16px",
                  background: "#f0efef",
                  border: "1px solid #bbb",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                Prisijungti
              </button>
              <button
                onClick={onRegister}
                style={{
                  padding: "8px 16px",
                  background: "#f0efef",
                  border: "1px solid #bbb",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                Prisiregistruoti
              </button>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "Times New Roman", fontSize: "20px" }}>
                Sveiki, {localStorage.getItem("username")}!
              </span>

              {isAdmin && (
                <button
                  onClick={() => setAdminOpen(true)}
                  style={{
                    padding: "8px 14px",
                    background: "#f0efef",
                    border: "1px solid #bbb",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontFamily: "Times New Roman",
                    fontSize: "14px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#e6e1e1")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#eceaea")
                  }
                >
                  Vartotojai
                </button>
              )}

              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  title="Profilis"
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    border: "1px solid #000000",
                    background: dropdownOpen ? "#d3ccd3" : "#f0efef",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  👤
                </button>
                {dropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "44px",
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #d6d6d6",
                      borderRadius: "10px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      minWidth: "140px",
                      zIndex: 1000,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "Times New Roman",
                        fontSize: "15px",
                        color: "#000000",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#e7e1e1")
                      }
                      onMouseLeave={(e) => (e.target.style.background = "none")}
                    >
                      Atsijungti
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

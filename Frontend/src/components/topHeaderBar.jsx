function HeaderBar({ isLoggedIn, onLogin, onRegister, onAvatarClick }) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid #ddd",
        boxSizing: "border-box",
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
            <button
              onClick={onAvatarClick}
              title="Profilis"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                border: "1px solid #000000",
                background: "#f0efef",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            >
              👤
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HeaderBar;

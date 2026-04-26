import { useEffect, useState } from "react";
import Modal from "./modal";
import { loginUser, registerUser } from "../services/authenticationApi";
import { useLanguage } from "./language";

function AuthModal({ mode, open, onCancel, onSubmit }) {
  const isLogin = mode === "login";
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setUsername("");
      setPassword("");
      setPassword2("");
      setError(null);
    }
  }, [open, mode]);

  const handlePrimary = async () => {
    setError(null);
    if (!username.trim()) return setError(t.err_username);
    if (!password) return setError(t.err_password);
    if (!isLogin) {
      if (!password2) return setError(t.err_password2);
      if (password !== password2) return setError(t.err_passwords_match);
    }
    try {
      if (isLogin) {
        const tokens = await loginUser({ username: username.trim(), password });
        localStorage.setItem("access", tokens.access);
        localStorage.setItem("refresh", tokens.refresh);
        localStorage.setItem("username", username.trim());
        onSubmit?.({ ok: true, mode: "login" });
      } else {
        await registerUser({
          email: email.trim(),
          username: username.trim(),
          password,
          password2,
        });
        const tokens = await loginUser({ username: username.trim(), password });
        localStorage.setItem("access", tokens.access);
        localStorage.setItem("refresh", tokens.refresh);
        localStorage.setItem("username", username.trim());
        onSubmit?.({ ok: true, mode: "register" });
      }
    } catch (e) {
      setError(e.message || "Klaida");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "7px",
    border: "1px solid #c8d4e3",
    boxSizing: "border-box",
    fontFamily: "Times New Roman",
    fontSize: "14px",
    color: "#1e2d4a",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "5px",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7a90aa",
    fontFamily: "Times New Roman",
  };

  return (
    <Modal
      open={open}
      title={isLogin ? t.login : t.register}
      onClose={onCancel}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {!isLogin && (
          <div>
            <label style={labelStyle}>{t.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="vardas@pastas.lt"
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
            />
          </div>
        )}
        <div>
          <label style={labelStyle}>{t.username_label}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            placeholder="vardas"
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
          />
        </div>
        <div>
          <label style={labelStyle}>{t.password_label}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="••••••••••"
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
          />
        </div>
        {!isLogin && (
          <div>
            <label style={labelStyle}>{t.password2_label}</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={inputStyle}
              placeholder="••••••••••"
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#c8d4e3")}
            />
          </div>
        )}

        {error && (
          <div
            style={{
              fontSize: "13px",
              color: "#c0392b",
              background: "#fff0ee",
              border: "1px solid #f5c6c0",
              borderRadius: "6px",
              padding: "8px 12px",
              fontFamily: "Times New Roman",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "4px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "7px 16px",
              background: "none",
              border: "1px solid #dce3ed",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "Times New Roman",
              fontSize: "13px",
              color: "#5a7090",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0f4fa";
              e.currentTarget.style.borderColor = "#7fa8d4";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.borderColor = "#dce3ed";
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handlePrimary}
            style={{
              padding: "7px 16px",
              background: "#1e2d4a",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "Times New Roman",
              fontSize: "13px",
              color: "#ffffff",
              fontWeight: "600",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2a3f63")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1e2d4a")}
          >
            {isLogin ? t.login : t.register}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default AuthModal;

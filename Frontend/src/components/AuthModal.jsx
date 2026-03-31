import { useEffect, useState } from "react";
import Modal from "./modal";
import { loginUser, registerUser } from "../services/authenticationApi";
import { useLanguage } from "./language";

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1.2px solid #000000",
  boxSizing: "border-box",
  fontFamily: "Times New Roman",
};

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

  return (
    <Modal
      open={open}
      title={isLogin ? t.login : t.register}
      onClose={onCancel}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {!isLogin && (
          <div>
            <div style={{ marginBottom: "6px" }}>{t.email}</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="vardas@pastas.lt"
            />
          </div>
        )}

        <div>
          <div style={{ marginBottom: "6px" }}>{t.username_label}</div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            placeholder="vardas"
          />
        </div>

        <div>
          <div style={{ marginBottom: "6px" }}>{t.password_label}</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="***********"
          />
        </div>

        {!isLogin && (
          <div>
            <div style={{ marginBottom: "6px" }}>{t.password2_label}</div>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={inputStyle}
              placeholder="***********"
            />
          </div>
        )}

        {error && <div style={{ color: "red" }}>{error}</div>}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "8px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              background: "#ffffff",
              border: "2px solid #000000",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handlePrimary}
            style={{
              padding: "8px 16px",
              background: "#c0c0c0",
              border: "2px solid #000000",
              borderRadius: "10px",
              cursor: "pointer",
              color: "#000",
            }}
          >
            {isLogin ? t.login : t.register}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default AuthModal;

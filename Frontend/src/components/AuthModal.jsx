import { useEffect, useState } from "react";
import Modal from "./modal";

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

  const handlePrimary = () => {
    setError(null);

    if (!email.trim()) return setError("Įveskite el. pašto adresą");
    if (!password) return setError("Įveskite slaptažodį");

    if (!isLogin) {
      if (!username.trim()) return setError("Įveskite prisijungimo vardą");
      if (!password2) return setError("Pakartokite slaptažodį");
      if (password !== password2) return setError("Slaptažodžiai nesutampa");
    }

    onSubmit?.({
      email: email.trim(),
      username: username.trim(),
      password,
    });
  };

  return (
    <Modal
      open={open}
      title={isLogin ? "Prisijungti" : "Prisiregistruoti"}
      onClose={onCancel}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>
          <div style={{ marginBottom: "6px" }}>El. pašto adresas</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="vardas@pastas.lt"
          />
        </div>

        {!isLogin && (
          <div>
            <div style={{ marginBottom: "6px" }}>Prisijungimo vardas</div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              placeholder="vardas"
            />
          </div>
        )}

        <div>
          <div style={{ marginBottom: "6px" }}>Slaptažodis</div>
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
            <div style={{ marginBottom: "6px" }}>Pakartotinas slaptažodžio įvedimas</div>
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

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
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
            Atšaukti
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
            {isLogin ? "Prisijungti" : "Prisiregistruoti"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default AuthModal;
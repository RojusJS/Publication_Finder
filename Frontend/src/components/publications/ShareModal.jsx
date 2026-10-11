import { useState } from "react";
import { errorMessage } from "../../api/client";
import { sharePublication } from "../../api/inbox";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../i18n/LanguageContext";
import { shortId } from "../../utils/publication";
import { Alert } from "../ui/Feedback";
import Modal from "../ui/Modal";

const MESSAGE_LIMIT = 500;

function ShareForm({ publication, onDone }) {
  const t = useT();
  const showToast = useToast();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sharePublication(username.trim(), shortId(publication.openalex_id), message.trim());
      showToast(t("share.sent", { user: username.trim() }), "success");
      onDone();
    } catch (err) {
      setError(errorMessage(err, t, "share.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <p className="small muted">{t("share.description")}</p>
      <div className="field">
        <label className="field-label" htmlFor="share-user">
          {t("share.recipient")}
        </label>
        <input
          id="share-user"
          className="input"
          autoFocus
          autoComplete="off"
          value={username}
          placeholder={t("share.recipient_placeholder")}
          onChange={(event) => setUsername(event.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="share-message">
          {t("share.message")}
        </label>
        <textarea
          id="share-message"
          className="textarea"
          rows={3}
          maxLength={MESSAGE_LIMIT}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <span className="field-hint">
          {message.length}/{MESSAGE_LIMIT}
        </span>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || !username.trim()}>
          {busy ? t("share.sending") : t("share.send")}
        </button>
      </div>
    </form>
  );
}

export default function ShareModal({ open, onClose, publication }) {
  const t = useT();
  if (!publication) return null;
  return (
    <Modal open={open} onClose={onClose} title={t("share.title")} size="sm">
      <ShareForm publication={publication} onDone={onClose} />
    </Modal>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as authApi from "../../api/auth";
import { errorMessage, fieldErrors } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../i18n/LanguageContext";
import Modal from "../ui/Modal";

function EmailForm() {
  const { t } = useLanguage();
  const showToast = useToast();
  const { user, updateUser } = useAuth();
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      updateUser(await authApi.updateProfile(email.trim()));
      showToast(t("account.email_saved"), "success");
    } catch (err) {
      setError(fieldErrors(err).email || errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack-sm" onSubmit={submit}>
      <h3 className="section-title">{t("account.email")}</h3>
      <div className="row">
        <input className="input" type="email" value={email} aria-label={t("account.email")} onChange={(event) => setEmail(event.target.value)} />
        <button type="submit" className="btn btn-secondary" disabled={busy || email.trim() === user.email}>
          {t("common.save")}
        </button>
      </div>
      {error && <span className="field-error">{error}</span>}
    </form>
  );
}

function PasswordForm() {
  const { t } = useLanguage();
  const showToast = useToast();
  const { updateUser } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (next.length < 10) {
      setErrors({ new_password: t("auth.error_password_length", { count: 10 }) });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      updateUser(await authApi.changePassword(current, next));
      setCurrent("");
      setNext("");
      showToast(t("account.password_saved"), "success");
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(Object.keys(fields).length ? fields : { form: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack-sm" onSubmit={submit}>
      <h3 className="section-title">{t("account.change_password")}</h3>
      <input className="input" type="password" autoComplete="current-password" placeholder={t("account.current_password")} aria-label={t("account.current_password")} value={current} onChange={(event) => setCurrent(event.target.value)} />
      {errors.current_password && <span className="field-error">{errors.current_password}</span>}
      <input className="input" type="password" autoComplete="new-password" placeholder={t("account.new_password")} aria-label={t("account.new_password")} value={next} onChange={(event) => setNext(event.target.value)} />
      {errors.new_password && <span className="field-error">{errors.new_password}</span>}
      {errors.form && <span className="field-error">{errors.form}</span>}
      <p className="tiny muted">{t("account.password_note")}</p>
      <div>
        <button type="submit" className="btn btn-secondary" disabled={busy || !current || !next}>
          {t("account.update_password")}
        </button>
      </div>
    </form>
  );
}

function DeleteAccount({ onDeleted }) {
  const { t } = useLanguage();
  const confirm = useConfirm();
  const { clearSession } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    const ok = await confirm({ title: t("account.delete_title"), message: t("account.delete_confirm"), confirmLabel: t("account.delete_button") });
    if (!ok) return;
    try {
      await authApi.deleteAccount(password);
      clearSession();
      onDeleted();
    } catch (err) {
      setError(fieldErrors(err).password || errorMessage(err, t));
    }
  };

  return (
    <form className="stack-sm card card-pad" style={{ borderColor: "var(--danger-border)" }} onSubmit={submit}>
      <h3 className="section-title" style={{ color: "var(--danger)" }}>{t("account.danger_zone")}</h3>
      <p className="small muted">{t("account.delete_description")}</p>
      <div className="row">
        <input className="input" type="password" autoComplete="current-password" placeholder={t("account.current_password")} aria-label={t("account.current_password")} value={password} onChange={(event) => setPassword(event.target.value)} />
        <button type="submit" className="btn btn-danger" disabled={!password}>
          {t("account.delete_button")}
        </button>
      </div>
      {error && <span className="field-error">{error}</span>}
    </form>
  );
}

export default function AccountModal({ open, onClose }) {
  const { t, formatDate } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <Modal open={open} onClose={onClose} size="md" title={t("account.title")}>
      <div className="stack-lg">
        <p className="small muted">
          {t("account.signed_in_as", { name: user.username })} · {t("account.member_since", { date: formatDate(user.date_joined) })}
        </p>
        <EmailForm />
        <PasswordForm />
        <DeleteAccount
          onDeleted={() => {
            onClose();
            navigate("/");
          }}
        />
      </div>
    </Modal>
  );
}

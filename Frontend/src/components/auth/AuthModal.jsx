import { useState } from "react";
import { errorMessage, fieldErrors } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../i18n/LanguageContext";
import { Alert } from "../ui/Feedback";
import Modal from "../ui/Modal";

const MIN_PASSWORD = 10;

function Field({ id, label, error, hint, ...props }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="input" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error ? (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      ) : (
        hint && <span className="field-hint">{hint}</span>
      )}
    </div>
  );
}

function AuthForm({ mode, onSwitch, onDone }) {
  const t = useT();
  const showToast = useToast();
  const { login, register } = useAuth();
  const isLogin = mode === "login";
  const [values, setValues] = useState({ username: "", email: "", password: "", password2: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (name) => (event) => setValues({ ...values, [name]: event.target.value });

  const validate = () => {
    const next = {};
    if (!values.username.trim()) next.username = t(isLogin ? "auth.error_identifier" : "auth.error_username");
    if (!isLogin && !/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = t("auth.error_email");
    if (!values.password) next.password = t("auth.error_password");
    else if (!isLogin && values.password.length < MIN_PASSWORD) next.password = t("auth.error_password_length", { count: MIN_PASSWORD });
    if (!isLogin && values.password !== values.password2) next.password2 = t("auth.error_password_match");
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const clientErrors = validate();
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length) return;
    setBusy(true);
    try {
      const user = isLogin
        ? await login(values.username.trim(), values.password)
        : await register({ ...values, username: values.username.trim(), email: values.email.trim() });
      showToast(t(isLogin ? "auth.welcome_back" : "auth.welcome", { name: user.username }), "success");
      onDone();
    } catch (error) {
      const fields = fieldErrors(error);
      if (Object.keys(fields).length) setErrors(fields);
      setFormError(fields.non_field_errors || (Object.keys(fields).length ? null : errorMessage(error, t, "auth.failed")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Field
        id="auth-username"
        label={t(isLogin ? "auth.identifier" : "auth.username")}
        autoComplete="username"
        autoFocus
        value={values.username}
        error={errors.username}
        onChange={set("username")}
      />
      {!isLogin && (
        <Field id="auth-email" type="email" label={t("auth.email")} autoComplete="email" value={values.email} error={errors.email} onChange={set("email")} />
      )}
      <Field
        id="auth-password"
        type="password"
        label={t("auth.password")}
        autoComplete={isLogin ? "current-password" : "new-password"}
        value={values.password}
        error={errors.password}
        hint={!isLogin ? t("auth.password_hint", { count: MIN_PASSWORD }) : undefined}
        onChange={set("password")}
      />
      {!isLogin && (
        <Field
          id="auth-password2"
          type="password"
          label={t("auth.password_repeat")}
          autoComplete="new-password"
          value={values.password2}
          error={errors.password2}
          onChange={set("password2")}
        />
      )}
      {formError && <Alert>{formError}</Alert>}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? t("common.please_wait") : t(isLogin ? "auth.login" : "auth.create_account")}
      </button>
      <p className="small muted" style={{ textAlign: "center" }}>
        {t(isLogin ? "auth.no_account" : "auth.have_account")}{" "}
        <button type="button" className="link-button" onClick={onSwitch}>
          {t(isLogin ? "auth.register" : "auth.login")}
        </button>
      </p>
    </form>
  );
}

export default function AuthModal() {
  const t = useT();
  const { authDialog, openAuth, closeAuth } = useAuth();
  return (
    <Modal open={Boolean(authDialog)} onClose={closeAuth} size="sm" title={t(authDialog === "register" ? "auth.register_title" : "auth.login_title")}>
      <AuthForm
        key={authDialog}
        mode={authDialog}
        onSwitch={() => openAuth(authDialog === "login" ? "register" : "login")}
        onDone={closeAuth}
      />
    </Modal>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import AdminUsersModal from "../admin/AdminUsersModal";
import AccountModal from "../auth/AccountModal";
import Dropdown from "../ui/Dropdown";
import Icon from "../ui/Icon";
import NotificationsMenu from "./NotificationsMenu";

function UserMenu() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null);

  return (
    <>
      <Dropdown
        align="end"
        buttonClassName="avatar-button"
        buttonProps={{ "aria-label": t("header.account_menu") }}
        label={
          <>
            <span className="avatar" aria-hidden="true">{user.username.charAt(0).toUpperCase()}</span>
            <span className="avatar-name truncate" style={{ maxWidth: 140 }}>{user.username}</span>
            <Icon name="chevronDown" size={14} />
          </>
        }
      >
        {({ close }) => (
          <>
            <div className="menu-header">
              <div className="strong small">{user.username}</div>
              <div className="tiny muted truncate">{user.email}</div>
            </div>
            <div className="menu-divider" />
            <button type="button" className="menu-item" onClick={() => { close(); setDialog("account"); }}>
              <Icon name="settings" /> {t("header.account_settings")}
            </button>
            {user.is_staff && (
              <button type="button" className="menu-item" onClick={() => { close(); setDialog("admin"); }}>
                <Icon name="shield" /> {t("header.manage_users")}
              </button>
            )}
            {user.is_staff && (
              <a className="menu-item" href="/admin/" target="_blank" rel="noopener noreferrer" onClick={close}>
                <Icon name="external" /> {t("header.django_admin")}
              </a>
            )}
            <div className="menu-divider" />
            <button
              type="button"
              className="menu-item"
              onClick={async () => {
                close();
                await logout();
                navigate("/");
              }}
            >
              <Icon name="logout" /> {t("header.logout")}
            </button>
          </>
        )}
      </Dropdown>
      <AccountModal open={dialog === "account"} onClose={() => setDialog(null)} />
      {user.is_staff && <AdminUsersModal open={dialog === "admin"} onClose={() => setDialog(null)} />}
    </>
  );
}

export default function AppHeader({ onToggleSidebar, sidebarOpen }) {
  const { t, lang, setLang } = useLanguage();
  const { status, isAuthenticated, openAuth } = useAuth();

  return (
    <header className="app-header">
      <button
        type="button"
        className="btn btn-on-dark btn-icon menu-toggle"
        aria-label={t("header.toggle_menu")}
        aria-expanded={sidebarOpen}
        onClick={onToggleSidebar}
      >
        <Icon name="menu" size={18} />
      </button>
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="book" size={17} />
        </span>
        <span className="brand-name">{t("app.name")}</span>
      </Link>
      <div className="header-actions">
        <button
          type="button"
          className="btn btn-on-dark btn-sm"
          onClick={() => setLang(lang === "lt" ? "en" : "lt")}
          aria-label={t("header.switch_language")}
          title={t("header.switch_language")}
        >
          <Icon name="globe" size={14} /> {lang === "lt" ? "LT" : "EN"}
        </button>
        {isAuthenticated && <NotificationsMenu />}
        {isAuthenticated && <UserMenu />}
        {status === "anonymous" && (
          <>
            <button type="button" className="btn btn-on-dark btn-sm" onClick={() => openAuth("login")}>
              {t("auth.login")}
            </button>
            <button type="button" className="btn btn-light btn-sm" onClick={() => openAuth("register")}>
              {t("auth.register")}
            </button>
          </>
        )}
      </div>
    </header>
  );
}

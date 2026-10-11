import { useState } from "react";
import { deleteUser, listUsers, toggleStaff } from "../../api/auth";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { Alert, EmptyState, Loading } from "../ui/Feedback";
import Modal from "../ui/Modal";
import Pagination from "../ui/Pagination";

function UserList() {
  const { t, formatDate, formatNumber } = useLanguage();
  const { user: me } = useAuth();
  const showToast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useDebouncedValue(search.trim(), 300);
  const users = useQuery(`admin-users:${query}:${page}`, () => listUsers({ q: query || undefined, page }));
  const data = users.data || users.previousData;

  const remove = async (user) => {
    const ok = await confirm({
      title: t("admin.delete_title"),
      message: t("admin.delete_message", { name: user.username }),
      confirmLabel: t("common.delete"),
    });
    if (!ok) return;
    try {
      await deleteUser(user.id);
      showToast(t("admin.deleted", { name: user.username }), "success");
      users.reload();
    } catch (error) {
      showToast(errorMessage(error, t));
    }
  };

  const toggle = async (user) => {
    try {
      const result = await toggleStaff(user.id);
      showToast(t(result.is_staff ? "admin.made_admin" : "admin.removed_admin", { name: result.username }), "success");
      users.reload();
    } catch (error) {
      showToast(errorMessage(error, t));
    }
  };

  return (
    <div className="stack">
      <input
        className="input"
        type="search"
        value={search}
        placeholder={t("admin.search")}
        aria-label={t("admin.search")}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      {users.error && <Alert>{errorMessage(users.error, t)}</Alert>}
      {!data && users.loading && <Loading label={t("common.loading")} />}
      {data && data.count === 0 && <EmptyState icon="users" title={t("admin.no_users")} />}
      {data && (
        <div className="stack-sm" style={{ opacity: users.loading ? 0.55 : 1 }}>
          {data.results.map((user) => {
            const isMe = user.id === me.id;
            const canDelete = !isMe && !user.is_superuser && (!user.is_staff || me.is_superuser);
            const canToggle = me.is_superuser && !isMe && !user.is_superuser;
            return (
              <div key={user.id} className="list-row user-row">
                <div className="list-row-main">
                  <div className="row-wrap">
                    <strong>{user.username}</strong>
                    {user.is_superuser && <span className="chip chip-warning">{t("admin.superuser")}</span>}
                    {user.is_staff && !user.is_superuser && <span className="chip chip-info">{t("admin.admin")}</span>}
                    {isMe && <span className="chip">{t("admin.you")}</span>}
                    {!user.is_active && <span className="chip chip-danger">{t("admin.inactive")}</span>}
                  </div>
                  <span className="small muted">{user.email}</span>
                  <span className="tiny muted">
                    {t("admin.joined", { date: formatDate(user.date_joined) })}
                    {user.last_login && ` · ${t("admin.last_login", { date: formatDate(user.last_login) })}`}
                  </span>
                  <span className="tiny muted">
                    {t("admin.stats", {
                      projects: formatNumber(user.project_count),
                      publications: formatNumber(user.publication_count),
                      searches: formatNumber(user.search_count),
                    })}
                  </span>
                </div>
                <div className="row">
                  {canToggle && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggle(user)}>
                      {t(user.is_staff ? "admin.revoke_admin" : "admin.grant_admin")}
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(user)}>
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <Pagination page={page} totalPages={Math.ceil(data.count / 25)} onChange={setPage} disabled={users.loading} />
        </div>
      )}
    </div>
  );
}

export default function AdminUsersModal({ open, onClose }) {
  const { t } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} size="lg" title={t("admin.title")}>
      <UserList />
    </Modal>
  );
}

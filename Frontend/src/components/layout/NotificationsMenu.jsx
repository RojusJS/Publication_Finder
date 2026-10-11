import { useEffect, useState } from "react";
import { errorMessage } from "../../api/client";
import { getNotificationSummary, listInbox, markRead } from "../../api/inbox";
import { listInvitations, respondToInvitation } from "../../api/projects";
import { useAuth } from "../../context/AuthContext";
import { useProjects } from "../../context/ProjectsContext";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import InboxModal from "../inbox/InboxModal";
import PublicationModal from "../publications/PublicationModal";
import Dropdown from "../ui/Dropdown";
import { Spinner } from "../ui/Feedback";
import Icon from "../ui/Icon";

const POLL_MS = 60_000;

function NotificationsContent({ close, onChanged, onOpenShared, onOpenInbox }) {
  const { t } = useLanguage();
  const showToast = useToast();
  const { reload: reloadProjects } = useProjects();
  const invitations = useQuery("invitations", listInvitations);
  const inbox = useQuery("inbox-unread", () => listInbox({ unread: "true" }));
  const [busyId, setBusyId] = useState(null);

  const respond = async (invitation, action) => {
    setBusyId(invitation.id);
    try {
      await respondToInvitation(invitation.id, action);
      invitations.setData((current = []) => current.filter((item) => item.id !== invitation.id));
      if (action === "accept") {
        reloadProjects();
        showToast(t("notifications.joined", { project: invitation.project_name }), "success");
      }
      onChanged();
    } catch (error) {
      showToast(errorMessage(error, t));
    } finally {
      setBusyId(null);
    }
  };

  const loading = invitations.loading || inbox.loading;
  const pending = invitations.data || [];
  const unread = inbox.data?.results || [];

  return (
    <div style={{ width: 340 }}>
      <div className="menu-header section-title">{t("notifications.invitations")}</div>
      {loading && (
        <div className="menu-empty row">
          <Spinner /> {t("common.loading")}
        </div>
      )}
      {!loading && pending.length === 0 && <div className="menu-empty">{t("notifications.no_invitations")}</div>}
      {pending.map((invitation) => (
        <div key={invitation.id} style={{ padding: "8px 10px" }}>
          <div className="small strong">{invitation.project_name}</div>
          <div className="tiny muted">
            {t("notifications.invited_by", { user: invitation.invited_by, role: t(`roles.${invitation.role}`) })}
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <button type="button" className="btn btn-primary btn-xs" disabled={busyId === invitation.id} onClick={() => respond(invitation, "accept")}>
              {t("notifications.accept")}
            </button>
            <button type="button" className="btn btn-danger-ghost btn-xs" disabled={busyId === invitation.id} onClick={() => respond(invitation, "decline")}>
              {t("notifications.decline")}
            </button>
          </div>
        </div>
      ))}
      <div className="menu-divider" />
      <div className="menu-header section-title">{t("notifications.shared")}</div>
      {!loading && unread.length === 0 && <div className="menu-empty">{t("notifications.no_shared")}</div>}
      {unread.slice(0, 5).map((item) => (
        <button
          key={item.id}
          type="button"
          className="menu-item"
          style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}
          onClick={() => {
            close();
            onOpenShared(item);
          }}
        >
          <span className="small strong" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.publication?.title}
          </span>
          <span className="tiny muted">
            {t("notifications.from", { user: item.sender.username })}
            {item.message ? ` · “${item.message}”` : ""}
          </span>
        </button>
      ))}
      <div className="menu-divider" />
      <button
        type="button"
        className="menu-item"
        onClick={() => {
          close();
          onOpenInbox();
        }}
      >
        <Icon name="inbox" /> {t("notifications.open_inbox")}
      </button>
    </div>
  );
}

export default function NotificationsMenu() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const [openShared, setOpenShared] = useState(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const summary = useQuery(user ? `notification-summary:${user.id}:${tick}` : null, getNotificationSummary);
  const counts = summary.data || summary.previousData || { pending_invitations: 0, unread_shared: 0 };
  const total = counts.pending_invitations + counts.unread_shared;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setTick((value) => value + 1);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = () => setTick((value) => value + 1);

  const openSharedItem = async (item) => {
    setOpenShared(item);
    if (!item.viewed) {
      await markRead(item.id).catch(() => {});
      refresh();
    }
  };

  return (
    <>
      <Dropdown
        align="end"
        buttonClassName="btn btn-on-dark btn-icon"
        buttonProps={{ "aria-label": total ? t("notifications.title_count", { count: total }) : t("notifications.title"), style: { position: "relative" } }}
        label={
          <>
            <Icon name="bell" size={18} />
            {total > 0 && <span className="count-badge icon-dot-badge">{total > 99 ? "99+" : total}</span>}
          </>
        }
        onOpenChange={(open) => open && refresh()}
      >
        {({ close }) => (
          <NotificationsContent close={close} onChanged={refresh} onOpenShared={openSharedItem} onOpenInbox={() => setInboxOpen(true)} />
        )}
      </Dropdown>
      <PublicationModal
        open={Boolean(openShared)}
        onClose={() => setOpenShared(null)}
        publication={openShared?.publication}
      />
      <InboxModal open={inboxOpen} onClose={() => { setInboxOpen(false); refresh(); }} onOpenItem={openSharedItem} />
    </>
  );
}

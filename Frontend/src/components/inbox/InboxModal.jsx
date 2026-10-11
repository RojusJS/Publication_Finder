import { useState } from "react";
import { errorMessage } from "../../api/client";
import { deleteInboxItem, listInbox, markAllRead } from "../../api/inbox";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { authorsLine } from "../../utils/publication";
import { Alert, EmptyState, Loading } from "../ui/Feedback";
import Icon from "../ui/Icon";
import Modal from "../ui/Modal";
import Pagination from "../ui/Pagination";

function InboxList({ onOpenItem }) {
  const { t, formatDate } = useLanguage();
  const showToast = useToast();
  const [page, setPage] = useState(1);
  const inbox = useQuery(`inbox:${page}`, () => listInbox({ page }));
  const data = inbox.data;

  const open = (item) => {
    inbox.setData((current) => current && { ...current, results: current.results.map((entry) => (entry.id === item.id ? { ...entry, viewed: true } : entry)) });
    onOpenItem(item);
  };

  const remove = async (item) => {
    try {
      await deleteInboxItem(item.id);
      inbox.reload();
    } catch (error) {
      showToast(errorMessage(error, t));
    }
  };

  const readAll = async () => {
    await markAllRead().catch(() => {});
    inbox.reload();
  };

  if (inbox.loading && !data) return <Loading label={t("common.loading")} />;
  if (inbox.error) return <Alert>{errorMessage(inbox.error, t)}</Alert>;
  if (!data || data.count === 0) return <EmptyState icon="inbox" title={t("inbox.empty_title")}>{t("inbox.empty")}</EmptyState>;

  return (
    <div className="stack">
      <div className="row-between">
        <span className="small muted">{t.count("inbox.count", data.count)}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={readAll}>
          <Icon name="check" /> {t("inbox.mark_all_read")}
        </button>
      </div>
      {data.results.map((item) => (
        <div key={item.id} className="list-row" style={item.viewed ? undefined : { borderColor: "var(--accent-soft)", background: "#f5f9ff" }}>
          <div className="list-row-main">
            <button type="button" className="list-row-title" onClick={() => open(item)}>
              {!item.viewed && <span className="count-badge" style={{ marginRight: 6, verticalAlign: "middle" }}>{t("inbox.new")}</span>}
              {item.publication?.title || t("publication.untitled")}
            </button>
            {item.publication?.authors?.length > 0 && <span className="small muted">{authorsLine(item.publication.authors, 3, t("common.et_al"))}</span>}
            <span className="tiny muted">
              {t("notifications.from", { user: item.sender.username })} · {formatDate(item.created_at)}
            </span>
            {item.message && <p className="small pre-wrap">“{item.message}”</p>}
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t("common.delete")} onClick={() => remove(item)}>
            <Icon name="trash" />
          </button>
        </div>
      ))}
      <Pagination page={page} totalPages={Math.ceil(data.count / 20)} onChange={setPage} />
    </div>
  );
}

export default function InboxModal({ open, onClose, onOpenItem }) {
  const { t } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} size="md" title={t("inbox.title")}>
      <InboxList onOpenItem={onOpenItem} />
    </Modal>
  );
}

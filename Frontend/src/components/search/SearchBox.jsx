import { useRef, useState } from "react";
import { clearSearchHistory, deleteSearchHistoryEntry, getSearchHistory } from "../../api/search";
import { useAuth } from "../../context/AuthContext";
import useClickOutside from "../../hooks/useClickOutside";
import useQuery from "../../hooks/useQuery";
import { useT } from "../../i18n/LanguageContext";
import Icon from "../ui/Icon";
import { SEARCH_MODES } from "./searchParams";

const MODE_LABELS = {
  all: "search.mode_all",
  title: "search.mode_title",
  author: "search.mode_author",
  title_and_author: "search.mode_title_author",
};

function HistoryDropdown({ filter, historyKey, onPick, onClose }) {
  const t = useT();
  const history = useQuery(historyKey, getSearchHistory);
  const items = (history.data || [])
    .filter((entry) => !filter || entry.query.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 8);

  if (!items.length) return null;

  const remove = async (event, entry) => {
    event.stopPropagation();
    await deleteSearchHistoryEntry(entry.id).catch(() => {});
    history.setData((current = []) => current.filter((item) => item.id !== entry.id));
  };
  const clearAll = async () => {
    await clearSearchHistory().catch(() => {});
    history.setData([]);
    onClose();
  };

  return (
    <div className="menu history-panel" style={{ position: "absolute", maxWidth: "none" }}>
      <div className="row-between menu-header">
        <span className="section-title">{t("search.recent")}</span>
        <button type="button" className="link-button tiny" onClick={clearAll}>
          {t("search.clear_history")}
        </button>
      </div>
      {items.map((entry) => (
        <div key={entry.id} className="history-item">
          <button type="button" className="menu-item" onClick={() => onPick(entry)}>
            <Icon name="search" size={14} />
            <span className="history-text truncate">{entry.query}</span>
            <span className="menu-item-hint">{t(MODE_LABELS[entry.search_by] || "search.mode_all")}</span>
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t("search.remove_history")} onClick={(event) => remove(event, entry)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Query input(s), search-mode pills and (for signed-in users) recent searches.
 * Local input state is initialised from the URL; the parent remounts the box
 * (via ``key``) when the URL changes.
 */
export default function SearchBox({ initial, onSearch, onPickHistory, busy }) {
  const t = useT();
  const { user } = useAuth();
  const [mode, setMode] = useState(initial.by);
  const [query, setQuery] = useState(initial.q);
  const [author, setAuthor] = useState(initial.author);
  const [historyOpen, setHistoryOpen] = useState(false);
  const containerRef = useRef(null);
  useClickOutside([containerRef], () => setHistoryOpen(false), historyOpen);

  const submit = (event) => {
    event.preventDefault();
    setHistoryOpen(false);
    onSearch({ q: query.trim(), by: mode, author: mode === "title_and_author" ? author.trim() : "" });
  };

  const placeholder = {
    all: t("search.placeholder_all"),
    title: t("search.placeholder_title"),
    author: t("search.placeholder_author"),
    title_and_author: t("search.placeholder_title"),
  }[mode];

  return (
    <div className="stack" style={{ width: "100%", alignItems: "center" }}>
      <div className="pill-group" role="group" aria-label={t("search.mode")}>
        {SEARCH_MODES.map((value) => (
          <button key={value} type="button" className="pill" aria-pressed={mode === value} onClick={() => setMode(value)}>
            {t(MODE_LABELS[value])}
          </button>
        ))}
      </div>
      <form className="search-box" role="search" onSubmit={submit} ref={containerRef}>
        {mode === "title_and_author" ? (
          <div className="search-box-split">
            <input
              className="input"
              type="search"
              value={query}
              placeholder={t("search.placeholder_title")}
              aria-label={t("search.placeholder_title")}
              onChange={(event) => setQuery(event.target.value)}
            />
            <input
              className="input"
              type="search"
              value={author}
              placeholder={t("search.placeholder_author_name")}
              aria-label={t("search.placeholder_author_name")}
              onChange={(event) => setAuthor(event.target.value)}
            />
          </div>
        ) : (
          <div style={{ position: "relative", flex: 1 }}>
            <span className="search-icon">
              <Icon name="search" />
            </span>
            <input
              className="input"
              type="search"
              value={query}
              maxLength={300}
              placeholder={placeholder}
              aria-label={placeholder}
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => user && setHistoryOpen(true)}
              onKeyDown={(event) => event.key === "Escape" && setHistoryOpen(false)}
            />
            {historyOpen && user && (
              <HistoryDropdown
                filter={query.trim()}
                historyKey={`history:${user.id}`}
                onClose={() => setHistoryOpen(false)}
                onPick={(entry) => {
                  setHistoryOpen(false);
                  onPickHistory(entry);
                }}
              />
            )}
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t("search.button")}
        </button>
      </form>
    </div>
  );
}

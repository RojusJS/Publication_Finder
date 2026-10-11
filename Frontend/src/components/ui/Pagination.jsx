import { useT } from "../../i18n/LanguageContext";
import Icon from "./Icon";

function pageWindow(page, total) {
  const pages = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach((value) => pages.add(value));
  return [...pages].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
}

export default function Pagination({ page, totalPages, onChange, disabled = false }) {
  const t = useT();
  if (!totalPages || totalPages <= 1) return null;
  const pages = pageWindow(page, totalPages);
  const items = [];
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) items.push(<span key={`gap-${value}`} className="page-gap">…</span>);
    items.push(
      <button
        key={value}
        type="button"
        className="page-btn"
        aria-current={value === page ? "page" : undefined}
        disabled={disabled}
        onClick={() => value !== page && onChange(value)}
      >
        {value}
      </button>,
    );
  });

  return (
    <nav className="pagination" aria-label={t("common.pagination")}>
      <button type="button" className="page-btn" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} aria-label={t("common.previous")}>
        <Icon name="chevronLeft" />
      </button>
      {items}
      <button type="button" className="page-btn" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)} aria-label={t("common.next")}>
        <Icon name="chevronRight" />
      </button>
    </nav>
  );
}

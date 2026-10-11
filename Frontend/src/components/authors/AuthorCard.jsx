import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import AuthorModal from "./AuthorModal";

export default function AuthorCard({ author }) {
  const { t, formatNumber } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <article className="pub-card">
      <button type="button" className="author-card" style={{ background: "none", border: 0, padding: 0 }} onClick={() => setOpen(true)}>
        <span className="author-initial" aria-hidden="true">
          {(author.display_name || "?").charAt(0).toUpperCase()}
        </span>
        <span className="pub-card-body">
          <span className="pub-title">{author.display_name}</span>
          {author.institutions?.length > 0 && <span className="pub-meta">{author.institutions.join(" · ")}</span>}
          <span className="pub-footer">
            <span className="chip">{t.count("authors.works_chip", author.works_count)}</span>
            <span className="chip">{t.count("publication.citations", author.cited_by_count)}</span>
            {author.h_index != null && <span className="chip">h-index {formatNumber(author.h_index)}</span>}
            {author.topics?.map((topic) => (
              <span key={topic} className="chip chip-outline">
                {topic}
              </span>
            ))}
          </span>
        </span>
      </button>
      <AuthorModal open={open} onClose={() => setOpen(false)} author={author} />
    </article>
  );
}

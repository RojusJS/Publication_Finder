import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { deletePublication, updatePublication } from "../../api/projects";
import { getPublication } from "../../api/search";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { bareDoi, shortId } from "../../utils/publication";
import CitationNetworkModal from "../network/CitationNetworkModal";
import FolderPickerModal from "../projects/FolderPickerModal";
import { Alert, Loading } from "../ui/Feedback";
import Icon from "../ui/Icon";
import Modal from "../ui/Modal";
import CiteModal from "./CiteModal";
import LabelPicker from "./LabelPicker";
import NotesSection from "./NotesSection";
import SaveToProjectMenu from "./SaveToProjectMenu";
import ShareModal from "./ShareModal";

const INSTITUTIONS_PREVIEW = 4;
const AUTHORS_PREVIEW = 12;

function PublicationBody({ publication, saved, onSavedChange, onClose, onOpenPublication }) {
  const { t, formatNumber, formatDate } = useLanguage();
  const showToast = useToast();
  const confirm = useConfirm();
  const [dialog, setDialog] = useState(null); // "cite" | "share" | "network" | "move"
  const [showAllAuthors, setShowAllAuthors] = useState(false);
  const [showAllInstitutions, setShowAllInstitutions] = useState(false);
  const [current, setCurrent] = useState(saved?.publication || null);

  const pub = current || publication;
  const canEdit = Boolean(saved) && (saved.role === "owner" || saved.role === "editor");
  const authors = pub.authors || [];
  const institutions = pub.institutions || [];
  const links = [
    pub.doi && { href: pub.doi, label: t("publication.open_doi"), icon: "external" },
    !pub.doi && pub.landing_page_url && { href: pub.landing_page_url, label: t("publication.open_page"), icon: "external" },
    pub.pdf_url && { href: pub.pdf_url, label: t("publication.open_pdf"), icon: "file" },
  ].filter(Boolean);

  const changed = (updated) => {
    setCurrent(updated);
    onSavedChange?.(updated);
  };

  const move = async (folderId) => {
    try {
      const updated = await updatePublication(saved.projectId, pub.id, { folder_id: folderId });
      changed(updated);
      setDialog(null);
      showToast(t("move.done"), "success");
    } catch (error) {
      showToast(errorMessage(error, t, "move.failed"));
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: t("publication.remove_title"),
      message: t("publication.remove_message", { title: pub.title }),
      confirmLabel: t("common.remove"),
    });
    if (!ok) return;
    try {
      await deletePublication(saved.projectId, pub.id);
      onSavedChange?.(null, pub);
      onClose();
    } catch (error) {
      showToast(errorMessage(error, t, "publication.remove_failed"));
    }
  };

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        {authors.length > 0 && (
          <p className="pub-authors">
            {(showAllAuthors ? authors : authors.slice(0, AUTHORS_PREVIEW)).join(", ")}
            {authors.length > AUTHORS_PREVIEW && (
              <>
                {" "}
                <button type="button" className="link-button small" onClick={() => setShowAllAuthors(!showAllAuthors)}>
                  {showAllAuthors ? t("common.show_less") : t("common.show_all_count", { count: authors.length })}
                </button>
              </>
            )}
          </p>
        )}
        <div className="row-wrap">
          {pub.year && <span className="chip">{pub.year}</span>}
          {pub.type && <span className="chip">{t.has(`types.${pub.type}`) ? t(`types.${pub.type}`) : pub.type}</span>}
          {pub.is_oa && <span className="chip chip-success">{t("publication.open_access")}</span>}
          {pub.is_retracted && <span className="chip chip-danger"><Icon name="alert" size={12} /> {t("publication.retracted")}</span>}
          <span className="chip">{t.count("publication.citations", pub.cited_by_count || 0)}</span>
          {pub.language && <span className="chip">{pub.language.toUpperCase()}</span>}
        </div>
        {pub.is_retracted && <Alert>{t("publication.retracted_warning")}</Alert>}
      </div>

      <div className="row-wrap">
        <SaveToProjectMenu openalexIds={[pub.openalex_id]} buttonClassName="btn btn-primary btn-sm" />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog("cite")}>
          <Icon name="quote" /> {t("publication.cite")}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog("network")}>
          <Icon name="network" /> {t("publication.network")}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog("share")}>
          <Icon name="share" /> {t("publication.share")}
        </button>
        {links.map((link) => (
          <a key={link.href} className="btn btn-ghost btn-sm" href={link.href} target="_blank" rel="noopener noreferrer">
            <Icon name={link.icon} /> {link.label}
          </a>
        ))}
      </div>

      {saved && (
        <div className="card card-pad row-wrap" style={{ gap: 12 }}>
          <span className="small muted">{t("publication.in_project")}:</span>
          <LabelPicker projectId={saved.projectId} publication={pub} canEdit={canEdit} onChange={changed} />
          {canEdit && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog("move")}>
                <Icon name="folder" /> {t("move.button")}
              </button>
              <button type="button" className="btn btn-danger-ghost btn-sm" onClick={remove}>
                <Icon name="trash" /> {t("common.remove")}
              </button>
            </>
          )}
          {pub.added_by && <span className="tiny muted">{t("publication.added_by", { user: pub.added_by, date: formatDate(pub.saved_at) })}</span>}
        </div>
      )}

      {pub.saved_in?.length > 0 && !saved && (
        <div className="row-wrap small">
          <Icon name="bookmark" />
          <span className="muted">{t("publication.saved_in")}:</span>
          {pub.saved_in.map((entry) => (
            <Link key={entry.project_id} className="chip chip-info" to={`/projects/${entry.project_id}`} onClick={onClose}>
              {entry.project_name}
            </Link>
          ))}
        </div>
      )}

      <section className="stack-sm">
        <h3 className="section-title">{t("publication.abstract")}</h3>
        {pub.abstract ? <p className="abstract-text">{pub.abstract}</p> : <p className="small muted">{t("publication.no_abstract")}</p>}
      </section>

      {pub.keywords?.length > 0 && (
        <section className="stack-sm">
          <h3 className="section-title">{t("publication.keywords")}</h3>
          <div className="row-wrap">
            {pub.keywords.map((keyword) => (
              <span key={keyword} className="chip chip-outline">
                {keyword}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="stack-sm">
        <h3 className="section-title">{t("publication.details")}</h3>
        <dl className="detail-grid">
          {pub.source_name && (
            <>
              <dt>{t("publication.source")}</dt>
              <dd>{pub.source_name}</dd>
            </>
          )}
          {(pub.publication_date || pub.year) && (
            <>
              <dt>{t("publication.published")}</dt>
              <dd>{pub.publication_date ? formatDate(pub.publication_date) : pub.year}</dd>
            </>
          )}
          {pub.biblio && (pub.biblio.volume || pub.biblio.first_page) && (
            <>
              <dt>{t("publication.volume_pages")}</dt>
              <dd>
                {[
                  pub.biblio.volume && `${t("publication.volume")} ${pub.biblio.volume}`,
                  pub.biblio.issue && `(${pub.biblio.issue})`,
                  pub.biblio.first_page && `${t("publication.pages")} ${pub.biblio.first_page}${pub.biblio.last_page && pub.biblio.last_page !== pub.biblio.first_page ? `–${pub.biblio.last_page}` : ""}`,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </dd>
            </>
          )}
          {pub.doi && (
            <>
              <dt>DOI</dt>
              <dd>
                <a href={pub.doi} target="_blank" rel="noopener noreferrer">
                  {bareDoi(pub.doi)}
                </a>
              </dd>
            </>
          )}
          {institutions.length > 0 && (
            <>
              <dt>{t("publication.institutions")}</dt>
              <dd>
                {(showAllInstitutions ? institutions : institutions.slice(0, INSTITUTIONS_PREVIEW)).join("; ")}
                {institutions.length > INSTITUTIONS_PREVIEW && (
                  <>
                    {" "}
                    <button type="button" className="link-button small" onClick={() => setShowAllInstitutions(!showAllInstitutions)}>
                      {showAllInstitutions ? t("common.show_less") : t("common.show_all_count", { count: institutions.length })}
                    </button>
                  </>
                )}
              </dd>
            </>
          )}
          <dt>OpenAlex</dt>
          <dd>
            <a href={pub.openalex_id} target="_blank" rel="noopener noreferrer">
              {shortId(pub.openalex_id)}
            </a>
          </dd>
          {typeof pub.cited_by_count === "number" && (
            <>
              <dt>{t("publication.cited_by")}</dt>
              <dd>{formatNumber(pub.cited_by_count)}</dd>
            </>
          )}
        </dl>
      </section>

      {saved && <NotesSection projectId={saved.projectId} publicationId={pub.id} canEdit={canEdit} onChanged={() => onSavedChange?.(pub)} />}

      <CiteModal open={dialog === "cite"} onClose={() => setDialog(null)} publication={pub} />
      <ShareModal open={dialog === "share"} onClose={() => setDialog(null)} publication={pub} />
      <CitationNetworkModal
        open={dialog === "network"}
        onClose={() => setDialog(null)}
        publication={pub}
        onOpenPublication={onOpenPublication}
      />
      {saved && (
        <FolderPickerModal
          open={dialog === "move"}
          onClose={() => setDialog(null)}
          projectId={saved.projectId}
          currentFolderId={pub.folder_id}
          onPick={move}
        />
      )}
    </div>
  );
}

/**
 * Publication details. Pass ``publication`` (full data) or ``openalexId`` (it
 * is fetched). ``saved`` = ``{ projectId, role, publication }`` adds project
 * features: label, notes, move and remove.
 */
export default function PublicationModal({ open, onClose, publication, openalexId, saved, onSavedChange }) {
  const { t } = useLanguage();
  const [nestedId, setNestedId] = useState(null);
  const known = publication || saved?.publication || null;
  const remoteId = !known && openalexId ? shortId(openalexId) : null;
  const remote = useQuery(open && remoteId ? `publication:${remoteId}` : null, () => getPublication(remoteId));
  const data = known || remote.data;

  return (
    <>
      <Modal open={open} onClose={onClose} size="lg" title={data?.title || t("publication.details")} titleClassName="serif">
        {remote.loading && <Loading label={t("common.loading")} />}
        {remote.error && <Alert>{errorMessage(remote.error, t, "publication.load_failed")}</Alert>}
        {data && (
          <PublicationBody
            publication={data}
            saved={saved}
            onSavedChange={onSavedChange}
            onClose={onClose}
            onOpenPublication={(id) => setNestedId(id)}
          />
        )}
      </Modal>
      {nestedId && <PublicationModal open onClose={() => setNestedId(null)} openalexId={nestedId} />}
    </>
  );
}

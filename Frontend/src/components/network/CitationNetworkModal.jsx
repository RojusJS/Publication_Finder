import { useT } from "../../i18n/LanguageContext";
import Modal from "../ui/Modal";
import CitationNetwork from "./CitationNetwork";

export default function CitationNetworkModal({ open, onClose, publication, onOpenPublication }) {
  const t = useT();
  if (!publication) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <>
          <span className="section-title" style={{ display: "block", marginBottom: 2 }}>
            {t("network.title")}
          </span>
          <span className="serif">{publication.title || t("publication.untitled")}</span>
        </>
      }
    >
      <CitationNetwork openalexId={publication.openalex_id} onOpenPublication={onOpenPublication} />
    </Modal>
  );
}

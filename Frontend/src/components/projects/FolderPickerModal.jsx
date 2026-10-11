import { useState } from "react";
import { getFolderTree } from "../../api/projects";
import useQuery from "../../hooks/useQuery";
import { useT } from "../../i18n/LanguageContext";
import { Loading } from "../ui/Feedback";
import Icon from "../ui/Icon";
import Modal from "../ui/Modal";

function FolderList({ projectId, currentFolderId, onPick }) {
  const t = useT();
  const tree = useQuery(`folder-tree:${projectId}`, () => getFolderTree(projectId));
  const [busy, setBusy] = useState(false);

  const pick = async (folderId) => {
    setBusy(true);
    await onPick(folderId);
    setBusy(false);
  };

  if (tree.loading) return <Loading label={t("common.loading")} />;
  const options = [{ id: null, name: t("save.project_root"), depth: 0, icon: "book" }, ...(tree.data || [])];
  return (
    <div className="stack-sm">
      {options.map((folder) => {
        const isCurrent = (folder.id ?? null) === (currentFolderId ?? null);
        return (
          <button
            key={folder.id ?? "root"}
            type="button"
            className={`menu-item ${isCurrent ? "is-active" : ""}`}
            style={{ paddingLeft: 10 + Math.min(folder.depth, 6) * 16 }}
            disabled={busy || isCurrent}
            onClick={() => pick(folder.id ?? null)}
          >
            <Icon name={folder.icon || "folder"} />
            <span className="truncate">{folder.name}</span>
            {isCurrent && <span className="menu-item-hint">{t("move.current")}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function FolderPickerModal({ open, onClose, projectId, currentFolderId, onPick, title }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title || t("move.title")}>
      <FolderList projectId={projectId} currentFolderId={currentFolderId} onPick={onPick} />
    </Modal>
  );
}

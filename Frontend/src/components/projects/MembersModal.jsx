import { useState } from "react";
import { errorMessage } from "../../api/client";
import { inviteMember, listMembers, removeMember, updateMember } from "../../api/projects";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import useQuery from "../../hooks/useQuery";
import { useT } from "../../i18n/LanguageContext";
import { Alert, Loading } from "../ui/Feedback";
import Modal from "../ui/Modal";

const STATUS_CHIP = { accepted: "chip-success", pending: "chip-warning", declined: "chip-danger" };

function InviteForm({ projectId, onInvited }) {
  const t = useT();
  const showToast = useToast();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await inviteMember(projectId, username.trim(), role);
      showToast(t("members.invited", { user: username.trim() }), "success");
      setUsername("");
      onInvited();
    } catch (err) {
      setError(errorMessage(err, t, "members.invite_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack-sm" onSubmit={submit}>
      <h3 className="section-title">{t("members.invite")}</h3>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ flex: "1 1 200px", width: "auto" }}
          value={username}
          autoComplete="off"
          placeholder={t("members.invite_placeholder")}
          aria-label={t("members.invite_placeholder")}
          onChange={(event) => setUsername(event.target.value)}
        />
        <select className="select" style={{ width: "auto" }} value={role} aria-label={t("members.role")} onChange={(event) => setRole(event.target.value)}>
          <option value="editor">{t("roles.editor")}</option>
          <option value="viewer">{t("roles.viewer")}</option>
        </select>
        <button type="submit" className="btn btn-primary" disabled={busy || !username.trim()}>
          {t("members.send_invite")}
        </button>
      </div>
      <p className="tiny muted">{t("members.roles_help")}</p>
      {error && <Alert>{error}</Alert>}
    </form>
  );
}

function MemberList({ project }) {
  const t = useT();
  const { user } = useAuth();
  const showToast = useToast();
  const confirm = useConfirm();
  const members = useQuery(`members:${project.id}`, () => listMembers(project.id));
  const isOwner = project.role === "owner";

  const changeRole = async (member, role) => {
    try {
      const updated = await updateMember(project.id, member.id, role);
      members.setData((current = []) => current.map((item) => (item.id === member.id ? updated : item)));
    } catch (error) {
      showToast(errorMessage(error, t));
    }
  };

  const remove = async (member) => {
    const ok = await confirm({
      title: t("members.remove_title"),
      message: t("members.remove_message", { user: member.user.username }),
      confirmLabel: t("common.remove"),
    });
    if (!ok) return;
    try {
      await removeMember(project.id, member.id);
      members.setData((current = []) => current.filter((item) => item.id !== member.id));
    } catch (error) {
      showToast(errorMessage(error, t));
    }
  };

  return (
    <div className="stack-lg">
      {isOwner && <InviteForm projectId={project.id} onInvited={members.reload} />}
      <section className="stack-sm">
        <h3 className="section-title">{t("members.list")}</h3>
        {members.loading && !members.data && <Loading label={t("common.loading")} />}
        {members.error && <Alert>{errorMessage(members.error, t)}</Alert>}
        {(members.data || []).map((member) => {
          const isMe = member.user.id === user?.id;
          return (
            <div key={member.id ?? `owner-${member.user.id}`} className="list-row" style={{ alignItems: "center" }}>
              <span className="author-initial" style={{ width: 34, height: 34, fontSize: 14 }} aria-hidden="true">
                {member.user.username.charAt(0).toUpperCase()}
              </span>
              <div className="list-row-main">
                <div className="row-wrap">
                  <strong>{member.user.username}</strong>
                  {isMe && <span className="chip">{t("members.you")}</span>}
                  {member.role !== "owner" && member.status !== "accepted" && (
                    <span className={`chip ${STATUS_CHIP[member.status]}`}>{t(`members.status_${member.status}`)}</span>
                  )}
                </div>
                {member.invited_by && <span className="tiny muted">{t("members.invited_by", { user: member.invited_by })}</span>}
              </div>
              {member.role === "owner" || !isOwner ? (
                <span className="chip">{t(`roles.${member.role}`)}</span>
              ) : (
                <>
                  <select
                    className="select select-sm"
                    style={{ width: "auto" }}
                    value={member.role}
                    aria-label={t("members.role_of", { user: member.user.username })}
                    onChange={(event) => changeRole(member, event.target.value)}
                  >
                    <option value="editor">{t("roles.editor")}</option>
                    <option value="viewer">{t("roles.viewer")}</option>
                  </select>
                  <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(member)}>
                    {t("common.remove")}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default function MembersModal({ open, onClose, project }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} size="md" title={t("members.title")}>
      <MemberList project={project} />
    </Modal>
  );
}

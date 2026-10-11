import Icon from "./Icon";

export function Spinner({ size = "md", onDark = false, label }) {
  return (
    <span
      className={`spinner ${size === "lg" ? "spinner-lg" : ""} ${onDark ? "spinner-on-dark" : ""}`}
      role="status"
      aria-label={label}
    />
  );
}

export function Loading({ label }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon = "search", title, children, action }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={28} strokeWidth={1.6} />
      {title && <div className="empty-state-title">{title}</div>}
      {children && <div>{children}</div>}
      {action}
    </div>
  );
}

export function Alert({ kind = "error", children }) {
  const icon = kind === "info" ? "info" : "alert";
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon name={icon} size={16} />
      <div>{children}</div>
    </div>
  );
}

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useT } from "../../i18n/LanguageContext";
import Icon from "./Icon";

const openStack = [];

function ModalDialog({ onClose, title, titleClassName = "", size, children, footer, initialFocusRef }) {
  const t = useT();
  const titleId = useId();
  const dialogRef = useRef(null);
  const tokenRef = useRef({});
  const pressStartedOnBackdrop = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const token = tokenRef.current;
    const previouslyFocused = document.activeElement;
    openStack.push(token);
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    if (initialFocusRef?.current) initialFocusRef.current.focus();
    else if (dialog && !dialog.contains(document.activeElement)) dialog.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape" && openStack[openStack.length - 1] === token) {
        event.stopPropagation();
        onCloseRef.current?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openStack.splice(openStack.indexOf(token), 1);
      if (openStack.length === 0) document.body.style.overflow = "";
      if (previouslyFocused && typeof previouslyFocused.focus === "function" && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
    // Runs once per opening; the latest onClose is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressStartedOnBackdrop.current) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id={titleId} className={`modal-title ${titleClassName}`}>
            {title}
          </h2>
          {onClose && (
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label={t("common.close")}>
              <Icon name="x" />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default function Modal({ open, size = "md", ...props }) {
  if (!open) return null;
  return createPortal(<ModalDialog size={size} {...props} />, document.body);
}

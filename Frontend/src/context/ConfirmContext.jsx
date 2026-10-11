import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Modal from "../components/ui/Modal";
import { useT } from "../i18n/LanguageContext";

const ConfirmContext = createContext(null);

/**
 * ``const confirm = useConfirm(); if (await confirm({ title, message })) ...``
 * A styled, accessible replacement for ``window.confirm``.
 */
export function ConfirmProvider({ children }) {
  const t = useT();
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setRequest(options);
      }),
    [],
  );

  const settle = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setRequest(null);
  };

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(request)}
        size="sm"
        title={request?.title}
        onClose={() => settle(false)}
        initialFocusRef={confirmButtonRef}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => settle(false)}>
              {t("common.cancel")}
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              className={`btn ${request?.danger === false ? "btn-primary" : "btn-danger"}`}
              onClick={() => settle(true)}
            >
              {request?.confirmLabel || t("common.confirm")}
            </button>
          </>
        }
      >
        {request?.message && <p className="muted">{request.message}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside ConfirmProvider");
  return context;
}

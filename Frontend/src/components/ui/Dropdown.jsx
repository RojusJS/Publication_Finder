import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useClickOutside from "../../hooks/useClickOutside";

const GAP = 6;
const MARGIN = 8;

/**
 * Button + popover menu rendered in a portal (so it is never clipped by
 * scrolling containers or modals). ``children`` is a render function
 * receiving ``{ close }``.
 */
export default function Dropdown({
  label,
  children,
  align = "start",
  buttonClassName = "btn btn-secondary btn-sm",
  buttonProps = {},
  menuClassName = "",
  disabled = false,
  onOpenChange,
  width,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const setOpenState = useCallback(
    (value) => {
      if (!value) setPosition(null);
      setOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  const close = useCallback(() => setOpenState(false), [setOpenState]);

  useClickOutside([triggerRef, menuRef], close, open);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + GAP + MARGIN && rect.top > spaceBelow;
    let left = align === "end" ? rect.right - menuWidth : rect.left;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - menuWidth - MARGIN));
    const top = openUp ? Math.max(MARGIN, rect.top - menuHeight - GAP) : rect.bottom + GAP;
    setPosition({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    };
    const observer = new ResizeObserver(place);
    if (menuRef.current) observer.observe(menuRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, place, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpenState(!open)}
        {...buttonProps}
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={`menu ${menuClassName}`}
            style={{
              position: "fixed",
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              zIndex: 2000,
              width,
              visibility: position ? "visible" : "hidden",
            }}
          >
            {children({ close })}
          </div>,
          document.body,
        )}
    </>
  );
}

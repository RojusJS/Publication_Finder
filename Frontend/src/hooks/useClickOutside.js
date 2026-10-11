import { useEffect, useRef } from "react";

/** Calls ``handler`` on a pointer press outside every element in ``refs`` while ``active``. */
export default function useClickOutside(refs, handler, active = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return undefined;
    const listener = (event) => {
      const inside = refs.some((ref) => ref.current && ref.current.contains(event.target));
      if (!inside) handlerRef.current(event);
    };
    document.addEventListener("pointerdown", listener);
    return () => document.removeEventListener("pointerdown", listener);
    // refs are stable ref objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

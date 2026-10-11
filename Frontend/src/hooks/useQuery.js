import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal data-fetching hook.
 *
 * ``key`` identifies the request (``null`` disables it); whenever it changes
 * ``fetcher`` runs again and results of outdated requests are ignored.
 *
 * - ``data``: result for the current key. While ``reload()`` refetches the
 *   same key the previous result stays available (stale-while-revalidate);
 *   after a key change it is ``undefined`` until the new result arrives.
 * - ``previousData``: the last result of *any* key, for callers that want to
 *   keep showing old content at reduced opacity while a new key loads.
 */
export default function useQuery(key, fetcher) {
  const [state, setState] = useState({ requestKey: null, key: null, data: undefined, error: null });
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const requestKey = key == null ? null : `${key}#${version}`;

  useEffect(() => {
    if (requestKey == null) return undefined;
    let active = true;
    Promise.resolve()
      .then(() => fetcherRef.current())
      .then(
        (data) => active && setState({ requestKey, key, data, error: null }),
        (error) =>
          active &&
          setState((previous) => ({
            requestKey,
            key,
            data: previous.key === key ? previous.data : undefined,
            error,
          })),
      );
    return () => {
      active = false;
    };
    // ``key`` is part of ``requestKey``.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((previous) => ({
        ...previous,
        data: typeof updater === "function" ? updater(previous.data) : updater,
      })),
    [],
  );

  const settled = requestKey != null && state.requestKey === requestKey;
  return {
    data: key != null && state.key === key ? state.data : undefined,
    previousData: state.data,
    error: settled ? state.error : null,
    loading: requestKey != null && !settled,
    reload,
    setData,
  };
}

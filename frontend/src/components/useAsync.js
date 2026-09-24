import { useCallback, useEffect, useState } from 'react';

// Runs an async loader when its dependencies change; ignores results from stale runs.
export default function useAsync(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState({ data: null, error, loading: false }));
    return () => { active = false; };
  }, [...deps, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}

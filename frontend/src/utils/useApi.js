import { useCallback, useEffect, useState } from 'react'

// Runs an API function when the page opens and tracks loading / error / data.
// `deps` works like useEffect deps: change them to fetch again.
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false // stops a slow, outdated request from overwriting newer data
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => !ignore && setState({ data, loading: false, error: null }))
      .catch((error) => !ignore && setState({ data: null, loading: false, error }))
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}

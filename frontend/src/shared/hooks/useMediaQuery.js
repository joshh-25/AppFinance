import { useEffect, useState } from 'react';

function getInitialMatch(query, defaultValue) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return defaultValue;
  }

  return window.matchMedia(query).matches;
}

export function useMediaQuery(query, defaultValue = false) {
  const [matches, setMatches] = useState(() => getInitialMatch(query, defaultValue));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event) => {
      setMatches(Boolean(event.matches));
    };

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;

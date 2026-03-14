"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * 미디어 쿼리 매칭 상태를 반환하는 훅
 * SSR 환경에서는 false를 반환하고, 클라이언트에서 hydration 후 실제 값으로 업데이트
 */
function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query, getMatches]);

  return matches;
}

export { useMediaQuery };

"use client";

import { useMediaQuery } from "./useMediaQuery";

type Breakpoint = "mobile" | "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/**
 * Tailwind CSS 브레이크포인트 기반 현재 화면 크기를 반환
 * - mobile: < 640px
 * - sm: >= 640px
 * - md: >= 768px
 * - lg: >= 1024px
 * - xl: >= 1280px
 * - 2xl: >= 1536px
 */
function useBreakpoint(): Breakpoint {
  const isSm = useMediaQuery(`(min-width: ${BREAKPOINTS.sm}px)`);
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
  const is2xl = useMediaQuery(`(min-width: ${BREAKPOINTS["2xl"]}px)`);

  if (is2xl) return "2xl";
  if (isXl) return "xl";
  if (isLg) return "lg";
  if (isMd) return "md";
  if (isSm) return "sm";
  return "mobile";
}

/**
 * 모바일 여부를 반환 (md 브레이크포인트 미만)
 */
function useIsMobile(): boolean {
  return !useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
}

/**
 * prefers-reduced-motion 사용자 설정 감지
 */
function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export { useBreakpoint, useIsMobile, usePrefersReducedMotion, BREAKPOINTS };
export type { Breakpoint };

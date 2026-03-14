import type { ReactNode } from "react";

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

/**
 * 시각적으로는 숨기되, 스크린 리더에는 노출되는 컴포넌트
 * Tailwind의 sr-only 클래스와 동일한 역할
 */
function VisuallyHidden({ children, as: Tag = "span" }: VisuallyHiddenProps) {
  return <Tag className="sr-only">{children}</Tag>;
}

export { VisuallyHidden };
export type { VisuallyHiddenProps };

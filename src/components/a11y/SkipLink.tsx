"use client";

interface SkipLinkProps {
  targetId?: string;
  label?: string;
}

/**
 * 키보드 사용자를 위한 "본문 바로가기" 링크
 * 평소에는 화면 밖에 숨겨져 있다가, 포커스 시 화면에 나타남
 */
function SkipLink({
  targetId = "main-content",
  label = "본문 바로가기",
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
    >
      {label}
    </a>
  );
}

export { SkipLink };
export type { SkipLinkProps };

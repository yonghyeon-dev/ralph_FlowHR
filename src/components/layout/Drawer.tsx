"use client";

import { useEffect, type ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type DrawerSize = "sm" | "md" | "lg";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: DrawerSize;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const sizeStyles: Record<DrawerSize, string> = {
  sm: "max-w-[360px]",
  md: "max-w-[480px]",
  lg: "max-w-[640px]",
};

function Drawer({
  open,
  onClose,
  title,
  size = "md",
  children,
  footer,
  className = "",
}: DrawerProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="드로어 닫기"
      />

      {/* Drawer panel */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "relative flex h-full w-full flex-col bg-surface-primary shadow-xl",
          "animate-slide-in-right",
          sizeStyles[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-border px-sp-6 py-sp-4">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
              aria-label="닫기"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-sp-6 py-sp-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-border px-sp-6 py-sp-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

export { Drawer };
export type { DrawerProps, DrawerSize };

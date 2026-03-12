"use client";

import { type ReactNode } from "react";

interface HeaderProps {
  brandName?: string;
  searchPlaceholder?: string;
  onSearch?: (_query: string) => void;
  actions?: ReactNode;
  avatar?: ReactNode;
  className?: string;
}

function Header({
  brandName = "FlowHR",
  searchPlaceholder = "검색...",
  onSearch,
  actions,
  avatar,
  className = "",
}: HeaderProps) {
  return (
    <header
      className={[
        "col-span-full flex h-header items-center gap-sp-4 border-b border-border bg-surface-primary px-sp-6",
        "z-[100]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Brand */}
      <div className="flex min-w-[160px] items-center gap-sp-2">
        <span className="h-2 w-2 rounded-full bg-brand" />
        <span className="text-lg font-bold text-brand">{brandName}</span>
      </div>

      {/* Search */}
      <div className="flex max-w-[480px] flex-1">
        <input
          type="text"
          placeholder={searchPlaceholder}
          onChange={(e) => onSearch?.(e.target.value)}
          className="w-full rounded-full border border-border bg-surface-secondary px-sp-4 py-sp-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-sp-3">{actions}</div>
      )}

      {/* Avatar */}
      {avatar ?? (
        <div className="h-8 w-8 rounded-full bg-surface-tertiary" />
      )}
    </header>
  );
}

function HeaderBadge({
  count,
  children,
}: {
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="relative flex items-center justify-center rounded-md p-sp-2 text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
    >
      {children}
      {count != null && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger-solid px-1 text-[10px] font-medium text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export { Header, HeaderBadge };
export type { HeaderProps };

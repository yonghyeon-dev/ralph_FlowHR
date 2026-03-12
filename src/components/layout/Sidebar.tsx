"use client";

import { type ReactNode } from "react";

type SidebarVariant = "admin" | "employee" | "platform";

interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  badge?: number | string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

interface SidebarProps {
  variant?: SidebarVariant;
  sections: NavSection[];
  activeId?: string;
  onNavigate?: (_id: string) => void;
  footer?: ReactNode;
  className?: string;
}

const variantStyles: Record<SidebarVariant, string> = {
  admin: "bg-surface-primary border-r border-border",
  employee: "bg-surface-primary border-r border-border",
  platform: "bg-surface-inverse border-r border-surface-inverse",
};

const variantItemStyles: Record<SidebarVariant, { base: string; active: string; hover: string }> = {
  admin: {
    base: "text-text-secondary",
    active: "bg-brand-soft text-brand-text font-medium",
    hover: "hover:bg-surface-secondary hover:text-text-primary",
  },
  employee: {
    base: "text-text-secondary",
    active: "bg-brand-soft text-brand-text font-medium",
    hover: "hover:bg-surface-secondary hover:text-text-primary",
  },
  platform: {
    base: "text-gray-400",
    active: "bg-white/10 text-white font-medium",
    hover: "hover:bg-white/5 hover:text-gray-200",
  },
};

const variantLabelStyles: Record<SidebarVariant, string> = {
  admin: "text-text-tertiary",
  employee: "text-text-tertiary",
  platform: "text-gray-500",
};

function Sidebar({
  variant = "admin",
  sections,
  activeId,
  onNavigate,
  footer,
  className = "",
}: SidebarProps) {
  const styles = variantItemStyles[variant];

  return (
    <aside
      className={[
        "flex w-sidebar flex-col gap-sp-2 overflow-y-auto py-sp-4",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <nav className="flex flex-1 flex-col gap-sp-1 px-sp-3">
        {sections.map((section, idx) => (
          <div key={section.label ?? idx} className="mb-sp-2">
            {section.label && (
              <span
                className={[
                  "mb-sp-2 block px-sp-3 text-xs font-semibold uppercase tracking-wider",
                  variantLabelStyles[variant],
                ].join(" ")}
              >
                {section.label}
              </span>
            )}
            {section.items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  className={[
                    "flex w-full items-center gap-sp-3 rounded-md px-sp-3 py-sp-2 text-sm transition-colors duration-fast",
                    isActive ? styles.active : [styles.base, styles.hover].join(" "),
                  ].join(" ")}
                >
                  {item.icon && (
                    <span className="flex h-[18px] w-[18px] items-center justify-center">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge != null && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-status-danger-solid px-1 text-[10px] font-medium text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      {footer && <div className="mt-auto border-t border-border px-sp-3 pt-sp-4">{footer}</div>}
    </aside>
  );
}

export { Sidebar };
export type { SidebarProps, SidebarVariant, NavItem, NavSection };

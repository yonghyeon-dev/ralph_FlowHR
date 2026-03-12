import type { HTMLAttributes } from "react";

type StatusBadgeVariant = "danger" | "warning" | "info" | "success" | "neutral";

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<StatusBadgeVariant, string> = {
  danger:
    "bg-status-danger-bg text-status-danger-text border-status-danger-border",
  warning:
    "bg-status-warning-bg text-status-warning-text border-status-warning-border",
  info: "bg-status-info-bg text-status-info-text border-status-info-border",
  success:
    "bg-status-success-bg text-status-success-text border-status-success-border",
  neutral:
    "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
};

const dotStyles: Record<StatusBadgeVariant, string> = {
  danger: "bg-status-danger-solid",
  warning: "bg-status-warning-solid",
  info: "bg-status-info-solid",
  success: "bg-status-success-solid",
  neutral: "bg-text-tertiary",
};

function StatusBadge({
  variant = "neutral",
  dot = true,
  className = "",
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5",
        "rounded-md border px-2 py-0.5",
        "text-xs font-medium leading-relaxed whitespace-nowrap",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {dot && (
        <span
          className={[
            "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
            dotStyles[variant],
          ]
            .filter(Boolean)
            .join(" ")}
        />
      )}
      {children}
    </span>
  );
}

export { StatusBadge };
export type { StatusBadgeProps, StatusBadgeVariant };

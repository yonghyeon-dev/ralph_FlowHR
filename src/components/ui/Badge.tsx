import type { HTMLAttributes } from "react";

type BadgeVariant = "danger" | "warning" | "info" | "success" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
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

function Badge({
  variant = "neutral",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1",
        "px-2 py-0.5 rounded-full border",
        "text-xs font-medium leading-relaxed whitespace-nowrap",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };

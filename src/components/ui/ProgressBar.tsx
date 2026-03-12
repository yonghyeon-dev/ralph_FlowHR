import type { HTMLAttributes } from "react";

type ProgressBarVariant = "brand" | "danger" | "warning" | "success" | "info";

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: ProgressBarVariant;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
}

const fillStyles: Record<ProgressBarVariant, string> = {
  brand: "bg-brand",
  danger: "bg-status-danger-solid",
  warning: "bg-status-warning-solid",
  success: "bg-status-success-solid",
  info: "bg-status-info-solid",
};

const sizeStyles: Record<string, string> = {
  sm: "h-1.5",
  md: "h-2",
};

function ProgressBar({
  value,
  max = 100,
  variant = "brand",
  label,
  showValue = false,
  size = "md",
  className = "",
  ...props
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const display = `${Math.round(pct)}%`;

  if (label || showValue) {
    return (
      <div
        className={["flex flex-col gap-sp-1", className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        <div className="flex items-center justify-between text-sm">
          {label && (
            <span className="text-text-secondary">{label}</span>
          )}
          {showValue && (
            <span className="tabular-nums text-text-secondary">
              {display}
            </span>
          )}
        </div>
        <div
          className={[
            "w-full overflow-hidden rounded-full bg-surface-tertiary",
            sizeStyles[size],
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            className={[
              "h-full rounded-full transition-all duration-normal",
              fillStyles[variant],
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "w-full overflow-hidden rounded-full bg-surface-tertiary",
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div
        className={[
          "h-full rounded-full transition-all duration-normal",
          fillStyles[variant],
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  );
}

export { ProgressBar };
export type { ProgressBarProps, ProgressBarVariant };

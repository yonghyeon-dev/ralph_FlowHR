import type { HTMLAttributes, ReactNode } from "react";

type DeltaDirection = "up" | "down" | "neutral";

interface KPICardProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow: string;
  value: string | number;
  label?: string;
  delta?: string;
  deltaDirection?: DeltaDirection;
  emphasis?: boolean;
  icon?: ReactNode;
}

const deltaStyles: Record<DeltaDirection, string> = {
  up: "text-status-danger-text",
  down: "text-status-success-text",
  neutral: "text-text-tertiary",
};

const deltaArrows: Record<DeltaDirection, string> = {
  up: "↑",
  down: "↓",
  neutral: "",
};

function KPICard({
  eyebrow,
  value,
  label,
  delta,
  deltaDirection = "neutral",
  emphasis = false,
  icon,
  className = "",
  ...props
}: KPICardProps) {
  return (
    <div
      className={[
        "rounded-lg border p-sp-5",
        emphasis
          ? "border-brand bg-gradient-to-br from-brand-soft to-surface-primary shadow-sm"
          : "border-border bg-surface-primary shadow-xs",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          {eyebrow}
        </span>
        {icon && (
          <span className="text-text-tertiary">{icon}</span>
        )}
      </div>
      <div className="mt-sp-2 text-4xl font-bold tabular-nums text-text-primary">
        {value}
      </div>
      {(label || delta) && (
        <div className="mt-sp-1 flex items-center gap-sp-2">
          {label && (
            <span className="text-sm text-text-secondary">{label}</span>
          )}
          {delta && (
            <span
              className={[
                "text-xs font-medium",
                deltaStyles[deltaDirection],
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {deltaArrows[deltaDirection]}
              {delta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface KPIGridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: 3 | 4 | 5;
  children: ReactNode;
}

const gridColumns: Record<number, string> = {
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
};

function KPIGrid({
  columns = 4,
  className = "",
  children,
  ...props
}: KPIGridProps) {
  return (
    <div
      className={["grid gap-sp-4", gridColumns[columns], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export { KPICard, KPIGrid };
export type { KPICardProps, KPIGridProps, DeltaDirection };

import type { HTMLAttributes, ReactNode } from "react";

type QueuePriority = "critical" | "high" | "medium" | "low";

interface QueueItemProps extends HTMLAttributes<HTMLDivElement> {
  priority?: QueuePriority;
  title: string;
  meta?: string;
  action?: ReactNode;
}

const priorityStyles: Record<QueuePriority, string> = {
  critical: "bg-status-danger-solid",
  high: "bg-status-warning-solid",
  medium: "bg-status-info-solid",
  low: "bg-border-strong",
};

function QueueItem({
  priority = "medium",
  title,
  meta,
  action,
  className = "",
  ...props
}: QueueItemProps) {
  return (
    <div
      className={[
        "flex items-stretch overflow-hidden rounded-md border border-border bg-surface-primary",
        "transition-shadow duration-fast hover:shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div
        className={["w-1 shrink-0", priorityStyles[priority]]
          .filter(Boolean)
          .join(" ")}
      />
      <div className="flex flex-1 items-center justify-between gap-sp-3 px-sp-4 py-sp-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            {title}
          </p>
          {meta && (
            <p className="mt-0.5 truncate text-xs text-text-tertiary">
              {meta}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

interface QueueListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function QueueList({ className = "", children, ...props }: QueueListProps) {
  return (
    <div
      className={["flex flex-col gap-sp-2", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export { QueueList, QueueItem };
export type { QueueListProps, QueueItemProps, QueuePriority };

"use client";

import type { ReactNode, ThHTMLAttributes } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (_row: T) => ReactNode;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  width?: string;
}

type SortDirection = "asc" | "desc" | null;

interface SortState {
  key: string;
  direction: SortDirection;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (_row: T) => string;
  sort?: SortState;
  onSort?: (_key: string) => void;
  onRowClick?: (_row: T) => void;
  activeRowKey?: string;
  emptyMessage?: string;
  className?: string;
}

const alignStyles: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right tabular-nums",
};

function SortIcon({
  direction,
}: {
  direction: SortDirection;
}) {
  return (
    <span className="ml-1 inline-flex text-text-tertiary">
      {direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}
    </span>
  );
}

function Th({
  column,
  sort,
  onSort,
  ...props
}: {
  column: Column<unknown>;
  sort?: SortState;
  onSort?: (_key: string) => void;
} & ThHTMLAttributes<HTMLTableCellElement>) {
  const isSorted = sort?.key === column.key;
  const align = column.align ?? "left";

  const handleClick = () => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  return (
    <th
      className={[
        "sticky top-0 z-10 px-sp-4 py-sp-3 text-xs font-semibold uppercase tracking-wider text-text-secondary",
        "bg-surface-secondary border-b border-border",
        alignStyles[align],
        column.sortable ? "cursor-pointer select-none hover:text-text-primary" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={column.width ? { width: column.width } : undefined}
      onClick={handleClick}
      {...props}
    >
      {column.header}
      {column.sortable && (
        <SortIcon direction={isSorted ? sort!.direction : null} />
      )}
    </th>
  );
}

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sort,
  onSort,
  onRowClick,
  activeRowKey,
  emptyMessage = "데이터가 없습니다.",
  className = "",
}: DataTableProps<T>) {
  return (
    <div
      className={["w-full overflow-x-auto", className]
        .filter(Boolean)
        .join(" ")}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <Th
                key={col.key}
                column={col as Column<unknown>}
                sort={sort}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-sp-4 py-sp-10 text-center text-sm text-text-tertiary"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const rowKey = keyExtractor(row);
              const isActive = activeRowKey === rowKey;
              return (
                <tr
                  key={rowKey}
                  className={[
                    "border-b border-border-subtle transition-colors duration-fast",
                    onRowClick ? "cursor-pointer" : "",
                    isActive
                      ? "bg-brand-soft"
                      : "hover:bg-surface-secondary",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => {
                    const align = col.align ?? "left";
                    return (
                      <td
                        key={col.key}
                        className={[
                          "px-sp-4 py-sp-3 text-text-primary",
                          alignStyles[align],
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {col.render
                          ? col.render(row)
                          : String(
                              (row as Record<string, unknown>)[col.key] ?? "",
                            )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export { DataTable };
export type { DataTableProps, Column, SortState, SortDirection };

"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface ChangeRecord {
  id: string;
  type: string;
  description: string | null;
  effectiveDate: string;
  employee: {
    id: string;
    name: string;
    employeeNumber: string;
  };
  fromDepartment: { name: string } | null;
  toDepartment: { name: string } | null;
  fromPosition: { name: string } | null;
  toPosition: { name: string } | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─── Constants ──────────────────────────────────────────────

const CHANGE_TYPE_FILTERS = [
  { key: "", label: "전체" },
  { key: "HIRE", label: "입사" },
  { key: "TRANSFER", label: "이동" },
  { key: "PROMOTION", label: "승진" },
  { key: "RESIGNATION", label: "퇴사" },
  { key: "TERMINATION", label: "해고" },
] as const;

const CHANGE_TYPE_MAP: Record<string, { label: string; variant: BadgeVariant; icon: string }> = {
  HIRE: { label: "입사", variant: "success", icon: "→" },
  TRANSFER: { label: "이동", variant: "info", icon: "↔" },
  PROMOTION: { label: "승진", variant: "info", icon: "↑" },
  RESIGNATION: { label: "퇴사", variant: "warning", icon: "←" },
  TERMINATION: { label: "해고", variant: "danger", icon: "✕" },
};

const PAGE_SIZE = 20;

// ─── Component ──────────────────────────────────────────────

export default function EmployeeChangesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchChanges = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));

    try {
      const res = await fetch(`/api/employee-changes?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setChanges(json.data);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, page]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleTypeFilter(type: string) {
    setTypeFilter(type);
    setPage(1);
  }

  // Group changes by month
  const grouped = groupByMonth(changes);

  const rangeStart = (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <h1 className="text-3xl font-bold text-text-primary">인사 변동</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          입사, 이동, 퇴사, 승진 등 인사 변동 이력을 확인합니다
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-sp-6 flex flex-wrap items-center gap-sp-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="이름, 사번 검색..."
          className="h-9 w-64 rounded-md border border-border bg-surface-primary px-sp-3 text-sm text-text-primary transition-colors duration-fast placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/10"
        />
        {CHANGE_TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => handleTypeFilter(f.key)}
            className={[
              "rounded-full border px-sp-3 py-sp-1 text-xs font-medium transition-colors duration-fast",
              typeFilter === f.key
                ? "border-brand bg-brand-soft text-brand-text"
                : "border-border bg-surface-primary text-text-secondary hover:bg-surface-secondary",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-border bg-surface-primary shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-sp-12">
            <span className="text-sm text-text-tertiary">불러오는 중...</span>
          </div>
        ) : changes.length === 0 ? (
          <div className="flex items-center justify-center py-sp-12">
            <span className="text-sm text-text-tertiary">인사 변동 이력이 없습니다</span>
          </div>
        ) : (
          <div className="p-sp-6">
            {grouped.map(([month, items]) => (
              <div key={month} className="mb-sp-6 last:mb-0">
                <h3 className="mb-sp-3 text-sm font-semibold text-text-secondary">
                  {month}
                </h3>
                <div className="relative border-l-2 border-border-subtle pl-sp-6">
                  {items.map((change) => (
                    <TimelineItem key={change.id} change={change} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-sp-4 py-sp-3">
            <span className="text-xs text-text-tertiary">
              {pagination.total.toLocaleString()}건 중 {rangeStart} –{" "}
              {rangeEnd} 표시
            </span>
            <div className="flex items-center gap-sp-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-xs text-text-secondary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                &laquo;
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-xs text-text-secondary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                &raquo;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function TimelineItem({ change }: { change: ChangeRecord }) {
  const typeInfo = CHANGE_TYPE_MAP[change.type];
  const dateStr = new Date(change.effectiveDate).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="relative mb-sp-4 last:mb-0">
      {/* Dot on the timeline line */}
      <div
        className={[
          "absolute -left-[calc(theme(spacing.sp-6)+5px)] top-1 h-2 w-2 rounded-full",
          typeInfo
            ? change.type === "HIRE"
              ? "bg-status-success-solid"
              : change.type === "RESIGNATION" || change.type === "TERMINATION"
                ? "bg-status-danger-solid"
                : "bg-status-info-solid"
            : "bg-gray-400",
        ].join(" ")}
      />

      <div className="flex items-start gap-sp-3">
        {/* Date */}
        <span className="mt-0.5 shrink-0 text-xs tabular-nums text-text-tertiary">
          {dateStr}
        </span>

        {/* Badge */}
        <span className="shrink-0">
          {typeInfo ? (
            <Badge variant={typeInfo.variant}>
              {typeInfo.icon} {typeInfo.label}
            </Badge>
          ) : (
            <Badge variant="neutral">{change.type}</Badge>
          )}
        </span>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <span className="font-medium text-text-primary">
            {change.employee.name}
          </span>
          <span className="ml-sp-1 text-xs text-text-tertiary">
            {change.employee.employeeNumber}
          </span>

          {/* Detail line */}
          <div className="mt-sp-1 text-sm text-text-secondary">
            {getChangeDetail(change)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function getChangeDetail(change: ChangeRecord): string {
  switch (change.type) {
    case "HIRE":
      return [
        change.toDepartment?.name,
        change.toPosition?.name,
        "입사",
      ]
        .filter(Boolean)
        .join(" · ");
    case "TRANSFER":
      return [
        change.fromDepartment?.name,
        "→",
        change.toDepartment?.name,
      ]
        .filter(Boolean)
        .join(" ");
    case "PROMOTION":
      return [
        change.fromPosition?.name,
        "→",
        change.toPosition?.name,
      ]
        .filter(Boolean)
        .join(" ");
    case "RESIGNATION":
    case "TERMINATION":
      return change.description ?? "";
    default:
      return change.description ?? "";
  }
}

function groupByMonth(changes: ChangeRecord[]): [string, ChangeRecord[]][] {
  const map = new Map<string, ChangeRecord[]>();

  for (const change of changes) {
    const d = new Date(change.effectiveDate);
    const key = `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월`;
    const list = map.get(key);
    if (list) {
      list.push(change);
    } else {
      map.set(key, [change]);
    }
  }

  return Array.from(map.entries());
}

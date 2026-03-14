"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  Badge,
  Button,
  DataTable,
  Select,
} from "@/components/ui";
import type { Column, SortState } from "@/components/ui/DataTable";
import type { BadgeVariant } from "@/components/ui/Badge";
import { Drawer } from "@/components/layout/Drawer";

// ─── Types ──────────────────────────────────────────────────

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  domain: string;
  plan: string;
  status: string;
  seats: number;
  employeeCount: number;
  ticketCount: number;
  mrr: number;
  billingStatus: string | null;
  paymentMethod: string | null;
  nextBillingDate: string | null;
  maxSeats: number | null;
  storageGb: number | null;
  apiCallsPerMonth: number | null;
  createdAt: string;
  updatedAt: string;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  domain: string;
  plan: string;
  status: string;
  seats: number;
  employeeCount: number;
  departmentCount: number;
  ticketCount: number;
  mrr: number;
  billingStatus: string | null;
  paymentMethod: string | null;
  billingEmail: string | null;
  nextBillingDate: string | null;
  maxSeats: number | null;
  storageGb: number | null;
  apiCallsPerMonth: number | null;
  supportLevel: string | null;
  recentTickets: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface StatusCounts {
  total: number;
  byStatus: Record<string, number>;
  byPlan: Record<string, number>;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─── Constants ──────────────────────────────────────────────

const PLAN_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  TRIAL: { label: "체험판", variant: "neutral" },
  STARTER: { label: "Starter", variant: "neutral" },
  GROWTH: { label: "Growth", variant: "info" },
  ENTERPRISE: { label: "Enterprise", variant: "info" },
};

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "활성", variant: "success" },
  SUSPENDED: { label: "유예", variant: "warning" },
  EXPIRED: { label: "만료", variant: "danger" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "ACTIVE", label: "활성" },
  { value: "SUSPENDED", label: "유예" },
  { value: "EXPIRED", label: "만료" },
];

const PLAN_FILTER_OPTIONS = [
  { value: "", label: "전체 플랜" },
  { value: "TRIAL", label: "체험판" },
  { value: "STARTER", label: "Starter" },
  { value: "GROWTH", label: "Growth" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

const TICKET_STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  OPEN: { label: "열림", variant: "info" },
  IN_PROGRESS: { label: "처리중", variant: "warning" },
  WAITING: { label: "대기", variant: "neutral" },
  RESOLVED: { label: "해결", variant: "success" },
  CLOSED: { label: "종료", variant: "neutral" },
};

// ─── Helpers ────────────────────────────────────────────────

function formatMRR(amount: number): string {
  if (amount === 0) return "—";
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatDate(iso);
}

// ─── Component ──────────────────────────────────────────────

export default function TenantsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <TenantsContent />
    </Suspense>
  );
}

function TenantsContent() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ total: 0, byStatus: {}, byPlan: {} });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, pageSize: 20, total: 0, totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "createdAt", direction: "desc" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (planFilter) params.set("plan", planFilter);
      if (sort.key) params.set("sortKey", sort.key);
      if (sort.direction) params.set("sortDir", sort.direction);
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/platform/tenants?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTenants(json.data);
        setCounts(json.counts);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, planFilter, sort, page]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Fetch tenant detail
  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/platform/tenants/${id}`);
      if (res.ok) {
        const json: TenantDetail = await res.json();
        setDetail(json);
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function handleRowClick(row: TenantRow) {
    setSelectedTenantId(row.id);
    setDrawerOpen(true);
    fetchDetail(row.id);
  }

  function handleSort(key: string) {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePlanChange(value: string) {
    setPlanFilter(value);
    setPage(1);
  }

  // ─── Table Columns ──────────────────────────────────────────

  const columns: Column<TenantRow>[] = [
    {
      key: "name",
      header: "회사명",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-text-primary">{row.name}</p>
          <p className="text-xs text-text-tertiary">{row.domain}</p>
        </div>
      ),
    },
    {
      key: "plan",
      header: "플랜",
      sortable: true,
      render: (row) => {
        const badge = PLAN_BADGE[row.plan];
        return badge ? (
          <Badge variant={badge.variant}>{badge.label}</Badge>
        ) : (
          <span>{row.plan}</span>
        );
      },
    },
    {
      key: "seats",
      header: "좌석",
      align: "right",
      render: (row) => (
        <span>
          {row.seats}
          {row.maxSeats ? ` / ${row.maxSeats}` : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: "상태",
      sortable: true,
      render: (row) => {
        const badge = STATUS_BADGE[row.status];
        return badge ? (
          <Badge variant={badge.variant}>{badge.label}</Badge>
        ) : (
          <span>{row.status}</span>
        );
      },
    },
    {
      key: "mrr",
      header: "MRR",
      align: "right",
      render: (row) => (
        <span className="font-medium">{formatMRR(row.mrr)}</span>
      ),
    },
    {
      key: "updatedAt",
      header: "최근 활동",
      sortable: true,
      render: (row) => (
        <span className="text-text-tertiary">{timeAgo(row.updatedAt)}</span>
      ),
    },
  ];

  // ─── Filter Chips ─────────────────────────────────────────

  const filterChips: { label: string; value: string; count: number }[] = [
    { label: "전체", value: "", count: counts.total },
    { label: "활성", value: "ACTIVE", count: counts.byStatus["ACTIVE"] ?? 0 },
    { label: "유예", value: "SUSPENDED", count: counts.byStatus["SUSPENDED"] ?? 0 },
    { label: "체험판", value: "TRIAL_PLAN", count: counts.byPlan["TRIAL"] ?? 0 },
    { label: "만료", value: "EXPIRED", count: counts.byStatus["EXPIRED"] ?? 0 },
  ];

  function handleChipClick(chip: { value: string }) {
    if (chip.value === "TRIAL_PLAN") {
      setStatusFilter("");
      setPlanFilter("TRIAL");
    } else {
      setPlanFilter("");
      setStatusFilter(chip.value);
    }
    setPage(1);
  }

  function isChipActive(chip: { value: string }): boolean {
    if (chip.value === "TRIAL_PLAN") return planFilter === "TRIAL" && !statusFilter;
    if (chip.value === "") return !statusFilter && !planFilter;
    return statusFilter === chip.value && !planFilter;
  }

  // ─── Pagination ─────────────────────────────────────────

  function getPageNumbers(): number[] {
    const { totalPages } = pagination;
    const current = page;
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(totalPages, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">테넌트 관리</h1>
          <p className="mt-sp-1 text-md text-text-secondary">
            전체 테넌트 목록 및 운영 현황
          </p>
        </div>
        <div className="flex items-center gap-sp-3">
          <Button variant="secondary" size="sm">CSV 내보내기</Button>
          <Button variant="primary" size="sm">테넌트 추가</Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-sp-4 flex flex-col gap-sp-3 lg:flex-row lg:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="회사명, 도메인으로 검색..."
          className="w-full max-w-xs px-sp-3 py-sp-2 border rounded-sm text-md font-sans bg-surface-primary text-text-primary transition-colors duration-fast focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand/10 border-border"
        />
        <div className="flex flex-wrap gap-sp-1">
          {filterChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => handleChipClick(chip)}
              className={[
                "rounded-full px-sp-3 py-sp-1 text-xs font-medium transition-colors duration-fast",
                isChipActive(chip)
                  ? "bg-brand text-white"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary",
              ].join(" ")}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-sp-2">
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          />
          <Select
            options={PLAN_FILTER_OPTIONS}
            value={planFilter}
            onChange={(e) => handlePlanChange(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={tenants}
            keyExtractor={(row) => row.id}
            sort={sort}
            onSort={handleSort}
            onRowClick={handleRowClick}
            activeRowKey={selectedTenantId ?? undefined}
            emptyMessage="조건에 맞는 테넌트가 없습니다"
          />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-sp-4 flex items-center justify-between">
              <span className="text-xs text-text-tertiary">
                전체 {pagination.total}건 중{" "}
                {(page - 1) * pagination.pageSize + 1}–
                {Math.min(page * pagination.pageSize, pagination.total)}건
              </span>
              <div className="flex gap-sp-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  이전
                </Button>
                {getPageNumbers().map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tenant Detail Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTenantId(null);
          setDetail(null);
        }}
        title={detail ? `${detail.name} — 테넌트 상세` : "테넌트 상세"}
        size="lg"
        footer={
          detail ? (
            <div className="flex gap-sp-2">
              <Button variant="primary" size="sm">관리자 콘솔 접속</Button>
              <Button variant="secondary" size="sm">플랜 변경</Button>
              <Button variant="ghost" size="sm" className="text-status-danger-text">
                일시 중지
              </Button>
            </div>
          ) : undefined
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-sp-12">
            <span className="text-sm text-text-tertiary">불러오는 중...</span>
          </div>
        ) : detail ? (
          <TenantDetailPanel detail={detail} />
        ) : (
          <div className="flex items-center justify-center py-sp-12">
            <span className="text-sm text-text-tertiary">
              데이터를 불러올 수 없습니다
            </span>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ─── Tenant Detail Panel ──────────────────────────────────────

function StatRow({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string;
  badge?: { text: string; variant: BadgeVariant };
}) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle py-sp-3 last:border-b-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="flex items-center gap-sp-2">
        {value && (
          <span className="text-sm font-semibold text-text-primary">{value}</span>
        )}
        {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
      </span>
    </div>
  );
}

function TenantDetailPanel({ detail }: { detail: TenantDetail }) {
  const planBadge = PLAN_BADGE[detail.plan];
  const statusBadge = STATUS_BADGE[detail.status];
  const supportLevelLabel: Record<string, string> = {
    email: "이메일",
    email_chat: "이메일 + 채팅",
    dedicated: "전담 지원",
  };

  return (
    <div className="flex flex-col gap-sp-6">
      {/* 기본 정보 */}
      <div>
        <h3 className="mb-sp-2 text-sm font-medium text-text-tertiary">
          기본 정보
        </h3>
        <StatRow label="회사명" value={detail.name} />
        <StatRow label="도메인" value={detail.domain} />
        <StatRow label="가입일" value={formatDate(detail.createdAt)} />
        <StatRow
          label="상태"
          badge={
            statusBadge
              ? { text: statusBadge.label, variant: statusBadge.variant }
              : { text: detail.status, variant: "neutral" }
          }
        />
        {detail.billingEmail && (
          <StatRow label="청구 이메일" value={detail.billingEmail} />
        )}
      </div>

      {/* 플랜 & 사용량 */}
      <div>
        <h3 className="mb-sp-2 text-sm font-medium text-text-tertiary">
          플랜 & 사용량
        </h3>
        <StatRow
          label="현재 플랜"
          badge={
            planBadge
              ? { text: planBadge.label, variant: planBadge.variant }
              : { text: detail.plan, variant: "neutral" }
          }
        />
        <StatRow
          label="좌석"
          value={
            detail.maxSeats
              ? `${detail.seats} / ${detail.maxSeats}`
              : `${detail.seats}`
          }
        />
        {detail.storageGb && (
          <StatRow label="스토리지" value={`${detail.storageGb} GB`} />
        )}
        {detail.apiCallsPerMonth && (
          <StatRow
            label="API 호출 (월)"
            value={`${detail.apiCallsPerMonth.toLocaleString("ko-KR")}`}
          />
        )}
        <StatRow label="MRR" value={formatMRR(detail.mrr)} />
        {detail.paymentMethod && (
          <StatRow label="결제 수단" value={detail.paymentMethod} />
        )}
        {detail.nextBillingDate && (
          <StatRow
            label="다음 결제일"
            value={formatDate(detail.nextBillingDate)}
          />
        )}
        {detail.supportLevel && (
          <StatRow
            label="지원 수준"
            value={supportLevelLabel[detail.supportLevel] ?? detail.supportLevel}
          />
        )}
      </div>

      {/* 운영 현황 */}
      <div>
        <h3 className="mb-sp-2 text-sm font-medium text-text-tertiary">
          운영 현황
        </h3>
        <StatRow label="직원 수" value={`${detail.employeeCount}명`} />
        <StatRow label="부서 수" value={`${detail.departmentCount}개`} />
        <StatRow label="지원 티켓" value={`${detail.ticketCount}건`} />
      </div>

      {/* 최근 지원 이력 */}
      <div>
        <h3 className="mb-sp-2 text-sm font-medium text-text-tertiary">
          최근 지원 이력
        </h3>
        {detail.recentTickets.length === 0 ? (
          <p className="text-sm text-text-tertiary">지원 이력이 없습니다</p>
        ) : (
          <div className="relative pl-sp-5">
            <div className="absolute bottom-0 left-[7px] top-0 w-0.5 bg-brand" />
            <div className="flex flex-col gap-sp-4">
              {detail.recentTickets.map((ticket) => {
                const tBadge = TICKET_STATUS_BADGE[ticket.status];
                return (
                  <div key={ticket.id} className="relative">
                    <div className="absolute -left-sp-5 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand" />
                    <div className="flex items-center gap-sp-2">
                      <span className="text-xs text-text-tertiary">
                        {formatDate(ticket.createdAt)}
                      </span>
                      {tBadge && (
                        <Badge variant={tBadge.variant}>{tBadge.label}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-text-primary">
                      {ticket.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

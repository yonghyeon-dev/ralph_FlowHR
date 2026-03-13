"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  KPICard,
  KPIGrid,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
  QueueList,
  QueueItem,
  DataTable,
} from "@/components/ui";
import type { QueuePriority, Column, SortState, BadgeVariant } from "@/components/ui";
import { ApprovalDetailDrawer } from "./ApprovalDetailDrawer";
import { WorkflowBuilder } from "./WorkflowBuilder";

// ─── Types ──────────────────────────────────────────────────

interface InboxItem {
  id: string;
  title: string;
  department: string;
  meta: string;
  priority: QueuePriority;
  requestType: string;
  slaExceeded: boolean;
  daysPending: number;
}

interface DashboardData {
  kpi: {
    pending: number;
    slaExceeded: number;
    slaDelta: number;
    escalations: number;
    weeklyComplete: number;
  };
  inbox: InboxItem[];
  stats: {
    avgProcessDays: number;
    todayProcessed: number;
    autoApproved: number;
    rejectionRate: number;
    slowestType: string;
  };
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "dashboard", label: "대시보드" },
  { key: "detail", label: "상세" },
  { key: "builder", label: "빌더" },
  { key: "history", label: "이력" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type InboxFilter = "all" | "urgent" | "sla";

// ─── Component ──────────────────────────────────────────────

export default function WorkflowPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <WorkflowContent />
    </Suspense>
  );
}

function WorkflowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "dashboard";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflow/dashboard");
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboard();
    }
  }, [activeTab, fetchDashboard]);

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "dashboard") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.push(`/admin/workflow${qs ? `?${qs}` : ""}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <h1 className="text-3xl font-bold text-text-primary">결재 관리</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          승인 요청 처리, 워크플로 설계, 결재 이력 관리
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-sp-6 flex gap-sp-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={[
              "px-sp-4 py-sp-2 text-sm font-medium transition-colors duration-fast",
              "-mb-px border-b-2",
              activeTab === tab.key
                ? "border-brand text-brand-text"
                : "border-transparent text-text-tertiary hover:text-text-secondary hover:border-border",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <DashboardTab
          data={data}
          loading={loading}
          onSelectRequest={setSelectedRequestId}
        />
      )}
      {activeTab === "detail" && (
        <DetailTab onSelectRequest={setSelectedRequestId} />
      )}
      {activeTab === "builder" && <WorkflowBuilder />}
      {activeTab === "history" && <HistoryTab />}

      {/* Approval Detail Drawer */}
      <ApprovalDetailDrawer
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        onActionComplete={fetchDashboard}
      />
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────────

function DashboardTab({
  data,
  loading,
  onSelectRequest,
}: {
  data: DashboardData | null;
  loading: boolean;
  onSelectRequest: (_id: string) => void;
}) {
  const [filter, setFilter] = useState<InboxFilter>("all");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">
          데이터를 불러올 수 없습니다
        </span>
      </div>
    );
  }

  const { kpi, inbox, stats } = data;

  const filteredInbox = inbox.filter((item) => {
    if (filter === "urgent") return item.priority === "critical" || item.priority === "high";
    if (filter === "sla") return item.slaExceeded;
    return true;
  });

  const filterChips: { key: InboxFilter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "urgent", label: "긴급" },
    { key: "sla", label: "SLA 초과" },
  ];

  return (
    <>
      {/* 4 KPI Cards */}
      <KPIGrid columns={4}>
        <KPICard
          eyebrow="승인 대기"
          value={kpi.pending}
          label="건"
          emphasis
        />
        <KPICard
          eyebrow="SLA 초과"
          value={kpi.slaExceeded}
          label="건 (48h+)"
          delta={
            kpi.slaDelta !== 0
              ? `${Math.abs(kpi.slaDelta)}건`
              : undefined
          }
          deltaDirection={
            kpi.slaDelta > 0 ? "up" : kpi.slaDelta < 0 ? "down" : "neutral"
          }
        />
        <KPICard
          eyebrow="상향 결재"
          value={kpi.escalations}
          label="건 에스컬레이션"
        />
        <KPICard
          eyebrow="이번 주 완료"
          value={kpi.weeklyComplete}
          label="건 처리 완료"
        />
      </KPIGrid>

      {/* Inbox + Stats */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
        {/* Left: Inbox (2/3) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>승인 대기열</CardTitle>
            <div className="flex gap-sp-2">
              {filterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setFilter(chip.key)}
                  className={[
                    "rounded-full px-sp-3 py-sp-1 text-xs font-medium transition-colors duration-fast",
                    filter === chip.key
                      ? "bg-brand text-text-inverse"
                      : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary",
                  ].join(" ")}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardBody>
            {filteredInbox.length > 0 ? (
              <QueueList>
                {filteredInbox.map((item) => (
                  <QueueItem
                    key={item.id}
                    priority={item.priority}
                    title={item.title}
                    meta={`${item.department} · ${item.meta}${item.daysPending > 0 ? ` · 대기 ${item.daysPending}일` : ""}`}
                    action={
                      <Button
                        variant={item.priority === "critical" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => onSelectRequest(item.id)}
                      >
                        검토
                      </Button>
                    }
                  />
                ))}
              </QueueList>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  대기 중인 요청이 없습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right: Stats (1/3) */}
        <Card>
          <CardHeader>
            <CardTitle>처리 현황</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-sp-4">
              <StatRow label="평균 처리 시간" value={`${stats.avgProcessDays}일`} />
              <StatRow label="오늘 처리" value={`${stats.todayProcessed}건`} />
              <StatRow label="자동 승인" value={`${stats.autoApproved}건`} />
              <StatRow label="반려율" value={`${stats.rejectionRate}%`} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">가장 느린 유형</span>
                <Badge variant="warning">{stats.slowestType}</Badge>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

// ─── Stat Row ───────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

// ─── Detail Tab ─────────────────────────────────────────────

interface RequestListItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  requestType: string;
  requesterName: string;
  department: string;
  createdAt: string;
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: "긴급",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

function DetailTab({ onSelectRequest }: { onSelectRequest: (_id: string) => void }) {
  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflow/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.inbox) {
          const items: RequestListItem[] = json.inbox.map((item: InboxItem) => ({
            id: item.id,
            title: item.title,
            status: "PENDING",
            priority: item.priority,
            requestType: item.requestType,
            requesterName: item.title.split(" — ")[1] ?? "",
            department: item.department,
            createdAt: "",
          }));
          setRequests(items);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">결재 요청이 없습니다</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>결재 요청 목록</CardTitle>
      </CardHeader>
      <CardBody>
        <QueueList>
          {requests.map((req) => (
            <QueueItem
              key={req.id}
              priority={req.priority as QueuePriority}
              title={req.title}
              meta={`${req.department} · ${PRIORITY_LABEL[req.priority] ?? req.priority}`}
              action={
                <Button size="sm" variant="secondary" onClick={() => onSelectRequest(req.id)}>
                  상세 보기
                </Button>
              }
            />
          ))}
        </QueueList>
      </CardBody>
    </Card>
  );
}

// ─── History Tab (WI-028) ──────────────────────────────────

interface HistoryRow {
  id: string;
  title: string;
  requesterName: string;
  department: string;
  requestType: string;
  createdAt: string;
  completedAt: string;
  status: string;
  processingDays: number;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const REQUEST_TYPE_LABEL: Record<string, string> = {
  LEAVE: "휴가",
  OVERTIME: "초과근무",
  EXPENSE: "경비",
  SALARY_CHANGE: "급여변경",
};

const HISTORY_STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  APPROVED: { label: "승인", variant: "success" },
  REJECTED: { label: "반려", variant: "danger" },
  CANCELLED: { label: "취소", variant: "neutral" },
};

const HISTORY_STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "APPROVED", label: "승인" },
  { key: "REJECTED", label: "반려" },
  { key: "CANCELLED", label: "취소" },
];

function HistoryTab() {
  const [records, setRecords] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState<SortState>({ key: "completedAt", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (sort.key) params.set("sortKey", sort.key);
      if (sort.direction) params.set("sortDir", sort.direction);
      params.set("page", String(page));
      params.set("pageSize", "10");

      const res = await fetch(`/api/workflow/history?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setRecords(json.data);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sort, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilter(key: string) {
    setStatusFilter(key);
    setPage(1);
  }

  function handleSort(key: string) {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
    setPage(1);
  }

  const columns: Column<HistoryRow>[] = [
    {
      key: "title",
      header: "요청",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-text-primary">{row.title}</span>
      ),
    },
    {
      key: "requester",
      header: "요청자",
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-text-primary">{row.requesterName}</div>
          <div className="text-xs text-text-tertiary">{row.department}</div>
        </div>
      ),
    },
    {
      key: "requestType",
      header: "유형",
      sortable: true,
      render: (row) => (
        <Badge variant="info">
          {REQUEST_TYPE_LABEL[row.requestType] ?? row.requestType}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "신청일",
      sortable: true,
    },
    {
      key: "completedAt",
      header: "완료일",
      sortable: true,
    },
    {
      key: "status",
      header: "결과",
      sortable: true,
      align: "center",
      render: (row) => {
        const meta = HISTORY_STATUS_BADGE[row.status] ?? {
          label: row.status,
          variant: "neutral" as BadgeVariant,
        };
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      key: "processingDays",
      header: "처리 시간",
      align: "right",
      render: (row) => (
        <span className="tabular-nums text-text-secondary">{row.processingDays}일</span>
      ),
    },
  ];

  function getPageNumbers(): number[] {
    const { totalPages } = pagination;
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    const adjusted = Math.max(1, end - 4);
    return Array.from({ length: end - adjusted + 1 }, (_, i) => adjusted + i);
  }

  const rangeStart = (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <>
      {/* Filter bar */}
      <div className="mb-sp-4 flex flex-wrap items-center gap-sp-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="요청명 또는 요청자 검색..."
          className="h-9 w-56 rounded-md border border-border bg-surface-primary px-sp-3 text-sm text-text-primary transition-colors duration-fast placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/10"
        />
        {HISTORY_STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => handleStatusFilter(f.key)}
            className={[
              "rounded-full border px-sp-3 py-sp-1 text-xs font-medium transition-colors duration-fast",
              statusFilter === f.key
                ? "border-brand bg-brand-soft text-brand-text"
                : "border-border bg-surface-primary text-text-secondary hover:bg-surface-secondary",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-surface-primary shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-sp-12">
            <span className="text-sm text-text-tertiary">불러오는 중...</span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={records}
            keyExtractor={(row) => row.id}
            sort={sort}
            onSort={handleSort}
            emptyMessage="결재 이력이 없습니다"
          />
        )}

        {/* Pagination */}
        {!loading && pagination.total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-sp-4 py-sp-3">
            <span className="text-xs text-text-tertiary">
              총 {pagination.total.toLocaleString()}건 중 {rangeStart} –{" "}
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
              {getPageNumbers().map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                    p === page
                      ? "bg-brand text-white"
                      : "text-text-secondary hover:bg-surface-secondary",
                  ].join(" ")}
                >
                  {p}
                </button>
              ))}
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
    </>
  );
}

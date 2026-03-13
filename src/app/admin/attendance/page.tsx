"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  KPICard,
  KPIGrid,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  BarChart,
  DataTable,
  QueueList,
  QueueItem,
} from "@/components/ui";
import type { BadgeVariant, QueuePriority, Column, SortState, SortDirection } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface KPIData {
  present: { rate: number; count: number; total: number };
  inProgress: { rate: number; count: number };
  absent: { rate: number; count: number };
  exceptions: {
    total: number;
    delta: number;
    late: number;
    correction: number;
    overtime: number;
    other: number;
  };
}

interface DepartmentRate {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface WeeklySummary {
  avgCheckIn: string;
  avgCheckOut: string;
  avgWorkHours: string;
  overtimeCases: number;
  near52hLimit: number;
}

interface DashboardData {
  kpi: KPIData;
  departmentRates: DepartmentRate[];
  weeklySummary: WeeklySummary;
}

interface ShiftEmployee {
  id: string;
  name: string;
  shifts: { shiftName: string; shiftType: string }[];
}

interface ShiftDepartment {
  id: string;
  name: string;
  employees: ShiftEmployee[];
}

interface ShiftBoardData {
  weekStart: string;
  weekDays: { date: string; label: string }[];
  departments: ShiftDepartment[];
}

interface AttendanceRecordRow {
  id: string;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workDisplay: string;
  status: string;
  overtime: number;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─── Exception Types ────────────────────────────────────────

interface ExceptionItem {
  id: string;
  employeeName: string;
  department: string;
  type: string;
  status: string;
  date: string;
  reason: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface ExceptionGroup {
  type: string;
  total: number;
  pending: number;
  items: ExceptionItem[];
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "dashboard", label: "대시보드" },
  { key: "shifts", label: "근무 편성표" },
  { key: "records", label: "근태 기록" },
  { key: "exceptions", label: "예외 관리" },
  { key: "closing", label: "마감" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Stat row component ─────────────────────────────────────

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
      {badge ? (
        <Badge variant={badge.variant}>{badge.text}</Badge>
      ) : (
        <span className="text-sm font-semibold text-text-primary">
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <AttendanceContent />
    </Suspense>
  );
}

function AttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "dashboard";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/dashboard");
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
    router.push(`/admin/attendance${qs ? `?${qs}` : ""}`);
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <h1 className="text-3xl font-bold text-text-primary">근태 관리</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          실시간 출퇴근 현황과 근태 이상 모니터링
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
        <DashboardTab data={data} loading={loading} />
      )}
      {activeTab === "shifts" && <ShiftBoardTab />}
      {activeTab === "records" && <RecordsTab />}
      {activeTab === "exceptions" && <ExceptionsTab />}
      {activeTab === "closing" && <ClosingTab />}
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────────

function DashboardTab({
  data,
  loading,
}: {
  data: DashboardData | null;
  loading: boolean;
}) {
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

  const { kpi, departmentRates, weeklySummary } = data;

  const exceptionLabel = [
    kpi.exceptions.late > 0 ? `지각 ${kpi.exceptions.late}` : null,
    kpi.exceptions.correction > 0
      ? `누락 ${kpi.exceptions.correction}`
      : null,
    kpi.exceptions.other > 0 ? `기타 ${kpi.exceptions.other}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {/* KPI Cards */}
      <KPIGrid columns={4}>
        <KPICard
          eyebrow="출근 완료"
          value={`${kpi.present.rate}%`}
          label={`${kpi.present.count.toLocaleString()} / ${kpi.present.total.toLocaleString()}명`}
          emphasis
        />
        <KPICard
          eyebrow="진행 중"
          value={`${kpi.inProgress.rate}%`}
          label={`${kpi.inProgress.count.toLocaleString()}명 근무 중`}
        />
        <KPICard
          eyebrow="미출근"
          value={`${kpi.absent.rate}%`}
          label={
            kpi.absent.count === 0
              ? "전원 출근 완료"
              : `${kpi.absent.count.toLocaleString()}명`
          }
        />
        <KPICard
          eyebrow="예외 건수"
          value={kpi.exceptions.total}
          label={exceptionLabel || "예외 없음"}
          delta={
            kpi.exceptions.delta !== 0
              ? `${Math.abs(kpi.exceptions.delta)}건 전일 대비`
              : undefined
          }
          deltaDirection={
            kpi.exceptions.delta > 0
              ? "up"
              : kpi.exceptions.delta < 0
                ? "down"
                : "neutral"
          }
        />
      </KPIGrid>

      {/* Department Chart + Weekly Summary */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
        {/* Department Attendance Rate Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>부서별 출근율</CardTitle>
            <span className="text-sm text-text-tertiary">
              오늘{" "}
              {new Date().toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              기준
            </span>
          </CardHeader>
          <CardBody>
            {departmentRates.length > 0 ? (
              <BarChart
                data={departmentRates}
                layout="vertical"
                height={Math.max(200, departmentRates.length * 48)}
                showTooltip
              />
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  부서 데이터 없음
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <CardTitle>주간 요약</CardTitle>
          </CardHeader>
          <CardBody>
            <StatRow
              label="평균 출근 시각"
              value={weeklySummary.avgCheckIn}
            />
            <StatRow
              label="평균 퇴근 시각"
              value={weeklySummary.avgCheckOut}
            />
            <StatRow
              label="평균 근무 시간"
              value={weeklySummary.avgWorkHours}
            />
            <StatRow
              label="초과근무 발생"
              badge={{
                text: `${weeklySummary.overtimeCases}건`,
                variant:
                  weeklySummary.overtimeCases > 0 ? "warning" : "success",
              }}
            />
            <StatRow
              label="52h 상한 임박"
              badge={{
                text: `${weeklySummary.near52hLimit}명`,
                variant:
                  weeklySummary.near52hLimit > 0 ? "danger" : "success",
              }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

// ─── Shift Board Tab ────────────────────────────────────────

const SHIFT_TYPE_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  REGULAR: { label: "주간", variant: "info" },
  MORNING: { label: "오전", variant: "info" },
  AFTERNOON: { label: "오후", variant: "info" },
  NIGHT: { label: "야간", variant: "warning" },
  FLEXIBLE: { label: "유연", variant: "success" },
};

function getShiftBadge(
  shiftName: string,
  shiftType: string,
): { label: string; variant: BadgeVariant } | null {
  if (!shiftName && !shiftType) return null;

  const mapped = SHIFT_TYPE_BADGE[shiftType];
  if (mapped) return mapped;

  // Fallback: use shift name with neutral badge
  return { label: shiftName || "—", variant: "neutral" };
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  const sm = start.getMonth() + 1;
  const sd = start.getDate();
  const em = end.getMonth() + 1;
  const ed = end.getDate();
  return `${sm}월 ${sd}일 – ${em}월 ${ed}일`;
}

function ShiftBoardTab() {
  const [shiftData, setShiftData] = useState<ShiftBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const fetchShifts = useCallback(async (ws: Date) => {
    setLoading(true);
    try {
      const dateStr = ws.toISOString().split("T")[0];
      const res = await fetch(`/api/attendance/shifts?weekStart=${dateStr}`);
      if (res.ok) {
        const json: ShiftBoardData = await res.json();
        setShiftData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts(weekStart);
  }, [weekStart, fetchShifts]);

  function handlePrevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function handleNextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (!shiftData) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">
          데이터를 불러올 수 없습니다
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>주간 편성표</CardTitle>
        <div className="flex items-center gap-sp-3">
          <Button variant="ghost" size="sm" onClick={handlePrevWeek}>
            &larr; 이전 주
          </Button>
          <span className="text-sm font-semibold text-text-primary">
            {formatWeekRange(shiftData.weekStart)}
          </span>
          <Button variant="ghost" size="sm" onClick={handleNextWeek}>
            다음 주 &rarr;
          </Button>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-sp-4 py-sp-3 text-left font-medium text-text-secondary">
                팀 / 이름
              </th>
              {shiftData.weekDays.map((day) => (
                <th
                  key={day.date}
                  className="px-sp-4 py-sp-3 text-center font-medium text-text-secondary"
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shiftData.departments.length === 0 ? (
              <tr>
                <td
                  colSpan={1 + shiftData.weekDays.length}
                  className="px-sp-4 py-sp-8 text-center text-text-tertiary"
                >
                  배정된 근무 편성이 없습니다
                </td>
              </tr>
            ) : (
              shiftData.departments.map((dept) => (
                <DepartmentShiftGroup
                  key={dept.id}
                  department={dept}
                  dayCount={shiftData.weekDays.length}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DepartmentShiftGroup({
  department,
  dayCount,
}: {
  department: ShiftDepartment;
  dayCount: number;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={1 + dayCount}
          className="bg-surface-secondary px-sp-4 py-sp-2 font-semibold text-text-primary"
        >
          {department.name}
        </td>
      </tr>
      {department.employees.map((emp) => (
        <tr
          key={emp.id}
          className="border-b border-border-subtle last:border-b-0"
        >
          <td className="px-sp-4 py-sp-2 text-text-primary">{emp.name}</td>
          {emp.shifts.map((shift, idx) => {
            const badge = getShiftBadge(shift.shiftName, shift.shiftType);
            return (
              <td key={idx} className="px-sp-4 py-sp-2 text-center">
                {badge ? (
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

// ─── Records Tab ────────────────────────────────────────────

const STATUS_BADGE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  PRESENT: { label: "정상", variant: "success" },
  ABSENT: { label: "결근", variant: "danger" },
  LATE: { label: "지각", variant: "warning" },
  EARLY_LEAVE: { label: "조퇴", variant: "warning" },
  HALF_DAY: { label: "반차", variant: "info" },
};

const STATUS_FILTERS = [
  { key: "", label: "전체" },
  { key: "PRESENT", label: "정상" },
  { key: "LATE", label: "지각" },
  { key: "ABSENT", label: "결근" },
  { key: "EARLY_LEAVE", label: "조퇴" },
  { key: "HALF_DAY", label: "반차" },
] as const;

const RECORDS_PAGE_SIZE = 10;

function RecordsTab() {
  const [records, setRecords] = useState<AttendanceRecordRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: RECORDS_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "date", direction: "desc" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("sortKey", sort.key);
    params.set("sortDir", sort.direction ?? "desc");
    params.set("page", String(page));
    params.set("pageSize", String(RECORDS_PAGE_SIZE));

    try {
      const res = await fetch(`/api/attendance/records?${params.toString()}`);
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
    fetchRecords();
  }, [fetchRecords]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilter(status: string) {
    setStatusFilter(status);
    setPage(1);
  }

  function handleSort(key: string) {
    setSort((prev) => {
      if (prev.key === key) {
        const next: SortDirection =
          prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc";
        return { key, direction: next ?? "asc" };
      }
      return { key, direction: "asc" };
    });
    setPage(1);
  }

  const columns: Column<AttendanceRecordRow>[] = [
    {
      key: "name",
      header: "이름",
      sortable: true,
      width: "160px",
      render: (row) => (
        <div className="flex items-center gap-sp-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text">
            {row.employeeName.slice(0, 1)}
          </div>
          <span className="font-medium">{row.employeeName}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "날짜",
      sortable: true,
      width: "120px",
    },
    {
      key: "checkIn",
      header: "출근",
      sortable: true,
      width: "80px",
      render: (row) => row.checkIn ?? "—",
    },
    {
      key: "checkOut",
      header: "퇴근",
      sortable: true,
      width: "80px",
      render: (row) => row.checkOut ?? "—",
    },
    {
      key: "workMinutes",
      header: "총 시간",
      sortable: true,
      align: "right",
      width: "100px",
      render: (row) => row.workDisplay,
    },
    {
      key: "status",
      header: "상태",
      sortable: true,
      width: "100px",
      render: (row) => {
        // Special display for overtime
        if (row.overtime > 0 && row.status === "PRESENT") {
          return <Badge variant="warning">초과근무</Badge>;
        }
        // Missing checkout
        if (row.checkIn && !row.checkOut && row.status === "PRESENT") {
          return <Badge variant="danger">체크아웃 누락</Badge>;
        }
        const info = STATUS_BADGE_MAP[row.status];
        return info ? (
          <Badge variant={info.variant}>{info.label}</Badge>
        ) : (
          row.status
        );
      },
    },
    {
      key: "actions",
      header: "액션",
      align: "center",
      width: "80px",
      render: () => (
        <Button variant="ghost" size="sm">
          수정
        </Button>
      ),
    },
  ];

  // Pagination helpers
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
  const rangeEnd = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  return (
    <>
      {/* Filter bar */}
      <div className="mb-sp-4 flex flex-wrap items-center gap-sp-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="이름 검색..."
          className="h-9 w-56 rounded-md border border-border bg-surface-primary px-sp-3 text-sm text-text-primary transition-colors duration-fast placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/10"
        />
        {STATUS_FILTERS.map((f) => (
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
            emptyMessage="근태 기록이 없습니다"
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

// ─── Exceptions Tab ─────────────────────────────────────────

const EXCEPTION_TYPE_META: Record<
  string,
  { label: string; badgeVariant: BadgeVariant; defaultPriority: QueuePriority }
> = {
  CORRECTION: { label: "근태 정정", badgeVariant: "danger", defaultPriority: "critical" },
  OVERTIME: { label: "초과근무", badgeVariant: "warning", defaultPriority: "high" },
  BUSINESS_TRIP: { label: "출장", badgeVariant: "info", defaultPriority: "medium" },
  REMOTE_WORK: { label: "재택근무", badgeVariant: "info", defaultPriority: "low" },
};

const EXCEPTION_STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "대기", variant: "warning" },
  APPROVED: { label: "승인", variant: "success" },
  REJECTED: { label: "반려", variant: "danger" },
};

function ExceptionsTab() {
  const [groups, setGroups] = useState<ExceptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ExceptionItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchExceptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/exceptions");
      if (res.ok) {
        const json = await res.json();
        setGroups(json.groups);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance/exceptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        setSelectedItem(null);
        await fetchExceptions();
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  return (
    <>
      {/* 4-type cards grid */}
      <div className="grid grid-cols-1 gap-sp-6 lg:grid-cols-2">
        {groups.map((group) => {
          const meta = EXCEPTION_TYPE_META[group.type] ?? {
            label: group.type,
            badgeVariant: "neutral" as BadgeVariant,
            defaultPriority: "medium" as QueuePriority,
          };
          return (
            <Card key={group.type}>
              <CardHeader>
                <CardTitle>{meta.label}</CardTitle>
                <Badge variant={meta.badgeVariant}>
                  {group.total}건{group.pending > 0 ? ` (대기 ${group.pending})` : ""}
                </Badge>
              </CardHeader>
              <CardBody>
                {group.items.length === 0 ? (
                  <div className="flex items-center justify-center py-sp-6">
                    <span className="text-sm text-text-tertiary">
                      해당 유형의 예외가 없습니다
                    </span>
                  </div>
                ) : (
                  <QueueList>
                    {group.items.map((item) => {
                      const priority: QueuePriority =
                        item.status === "PENDING" ? meta.defaultPriority : "low";
                      const statusInfo = EXCEPTION_STATUS_BADGE[item.status];
                      return (
                        <QueueItem
                          key={item.id}
                          priority={priority}
                          title={item.employeeName}
                          meta={`${item.department} · ${item.date} · ${item.reason}`}
                          action={
                            <div className="flex items-center gap-sp-2">
                              {statusInfo && (
                                <Badge variant={statusInfo.variant}>
                                  {statusInfo.label}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedItem(item)}
                              >
                                상세
                              </Button>
                            </div>
                          }
                        />
                      );
                    })}
                  </QueueList>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Detail overlay */}
      {selectedItem && (
        <ExceptionDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAction={handleAction}
          actionLoading={actionLoading}
        />
      )}
    </>
  );
}

function ExceptionDetailPanel({
  item,
  onClose,
  onAction,
  actionLoading,
}: {
  item: ExceptionItem;
  onClose: () => void;
  onAction: (_id: string, _action: "approve" | "reject") => void;
  actionLoading: boolean;
}) {
  const typeMeta = EXCEPTION_TYPE_META[item.type];
  const statusInfo = EXCEPTION_STATUS_BADGE[item.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-sp-4 w-full max-w-lg rounded-xl border border-border bg-surface-primary p-sp-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-sp-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">예외 상세</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary transition-colors hover:text-text-primary"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="space-y-sp-3">
          <DetailRow label="유형">
            <Badge variant={typeMeta?.badgeVariant ?? "neutral"}>
              {typeMeta?.label ?? item.type}
            </Badge>
          </DetailRow>
          <DetailRow label="상태">
            {statusInfo && (
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            )}
          </DetailRow>
          <DetailRow label="직원" value={item.employeeName} />
          <DetailRow label="부서" value={item.department} />
          <DetailRow label="날짜" value={item.date} />
          <DetailRow label="사유" value={item.reason} />
          <DetailRow label="신청일" value={item.createdAt} />
          {item.approvedBy && (
            <DetailRow label="처리자" value={item.approvedBy} />
          )}
          {item.approvedAt && (
            <DetailRow label="처리일" value={item.approvedAt} />
          )}
        </div>

        {/* Actions */}
        {item.status === "PENDING" && (
          <div className="mt-sp-6 flex justify-end gap-sp-3">
            <Button
              variant="danger"
              size="sm"
              onClick={() => onAction(item.id, "reject")}
              disabled={actionLoading}
            >
              반려
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAction(item.id, "approve")}
              disabled={actionLoading}
            >
              승인
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle py-sp-2 last:border-b-0">
      <span className="text-sm text-text-secondary">{label}</span>
      {children ?? (
        <span className="text-sm font-medium text-text-primary">{value}</span>
      )}
    </div>
  );
}

// ─── Closing Tab ────────────────────────────────────────────

interface ClosingChecklistItem {
  id: string;
  title: string;
  meta: string;
  status: "complete" | "pending" | "progress" | "not_started";
  statusLabel: string;
  priority: "low" | "medium" | "high" | "critical";
}

interface ClosingData {
  year: number;
  month: number;
  status: "OPEN" | "IN_REVIEW" | "CLOSED";
  closedBy: string | null;
  closedAt: string | null;
  totalDays: number;
  totalHours: number;
  checklist: ClosingChecklistItem[];
}

const CLOSING_STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  OPEN: { label: "진행 중", variant: "info" },
  IN_REVIEW: { label: "검토 중", variant: "warning" },
  CLOSED: { label: "마감 완료", variant: "success" },
};

const CHECKLIST_STATUS_BADGE: Record<string, BadgeVariant> = {
  complete: "success",
  pending: "warning",
  progress: "info",
  not_started: "neutral",
};

const CHECKLIST_PRIORITY: Record<string, QueuePriority> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

function ClosingTab() {
  const [closingData, setClosingData] = useState<ClosingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClosing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/closing");
      if (res.ok) {
        const json: ClosingData = await res.json();
        setClosingData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClosing();
  }, [fetchClosing]);

  async function handleAdvance() {
    if (!closingData || closingData.status === "CLOSED") return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance/closing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: closingData.year,
          month: closingData.month,
          action: "advance",
        }),
      });
      if (res.ok) {
        await fetchClosing();
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (!closingData) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">
          데이터를 불러올 수 없습니다
        </span>
      </div>
    );
  }

  const statusBadge = CLOSING_STATUS_BADGE[closingData.status] ?? {
    label: closingData.status,
    variant: "neutral" as BadgeVariant,
  };

  const nextActionLabel =
    closingData.status === "OPEN"
      ? "검토 시작"
      : closingData.status === "IN_REVIEW"
        ? "최종 마감"
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {closingData.year}년 {closingData.month}월 근태 마감
        </CardTitle>
        <div className="flex items-center gap-sp-3">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {nextActionLabel && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdvance}
              disabled={actionLoading}
            >
              {nextActionLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <QueueList>
          {closingData.checklist.map((item) => (
            <QueueItem
              key={item.id}
              priority={CHECKLIST_PRIORITY[item.priority] ?? "low"}
              title={item.title}
              meta={item.meta}
              action={
                <Badge variant={CHECKLIST_STATUS_BADGE[item.status] ?? "neutral"}>
                  {item.statusLabel}
                </Badge>
              }
            />
          ))}
        </QueueList>
      </CardBody>
    </Card>
  );
}

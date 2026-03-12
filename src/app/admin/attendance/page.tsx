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
} from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

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
      {activeTab === "records" && (
        <PlaceholderTab label="근태 기록" />
      )}
      {activeTab === "exceptions" && (
        <PlaceholderTab label="예외 관리" />
      )}
      {activeTab === "closing" && (
        <PlaceholderTab label="마감" />
      )}
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

// ─── Placeholder for future tabs ────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            {label} 탭은 다음 WI에서 구현됩니다
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

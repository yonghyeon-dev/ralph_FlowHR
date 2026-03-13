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
} from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface KPIData {
  todayAbsences: { count: number };
  pendingRequests: { count: number; delta: number };
  avgRemaining: { days: number; employeeCount: number };
  monthUsage: { days: number; delta: number };
}

interface DashboardData {
  kpi: KPIData;
}

interface CalendarData {
  year: number;
  month: number;
  eventDays: number[];
  todayAbsences: {
    count: number;
    items: { employeeName: string; department: string; leaveType: string }[];
    remainingCount: number;
  };
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "dashboard", label: "대시보드" },
  { key: "calendar", label: "캘린더" },
  { key: "policies", label: "휴가 정책" },
  { key: "requests", label: "신청 큐" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Component ──────────────────────────────────────────────

export default function LeavePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <LeaveContent />
    </Suspense>
  );
}

function LeaveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "dashboard";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave/dashboard");
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
    router.push(`/admin/leave${qs ? `?${qs}` : ""}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <h1 className="text-3xl font-bold text-text-primary">휴가 관리</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          휴가 현황, 정책, 요청 관리
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
      {activeTab === "calendar" && <CalendarTab />}
      {activeTab === "policies" && (
        <PlaceholderTab message="휴가 정책 관리 (WI-022)" />
      )}
      {activeTab === "requests" && (
        <PlaceholderTab message="휴가 신청 큐 (WI-023)" />
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

  const { kpi } = data;

  return (
    <KPIGrid columns={4}>
      <KPICard
        eyebrow="오늘 휴가"
        value={kpi.todayAbsences.count}
        label="명 부재 중"
        emphasis
      />
      <KPICard
        eyebrow="대기 중 요청"
        value={kpi.pendingRequests.count}
        label="건 승인 대기"
        delta={
          kpi.pendingRequests.delta !== 0
            ? `${Math.abs(kpi.pendingRequests.delta)}건 전일 대비`
            : undefined
        }
        deltaDirection={
          kpi.pendingRequests.delta > 0
            ? "up"
            : kpi.pendingRequests.delta < 0
              ? "down"
              : "neutral"
        }
      />
      <KPICard
        eyebrow="잔여 연차 평균"
        value={kpi.avgRemaining.days}
        label="일 (전사 평균)"
      />
      <KPICard
        eyebrow="이번 달 사용"
        value={kpi.monthUsage.days}
        label="일 총 사용"
        delta={
          kpi.monthUsage.delta !== 0
            ? `${Math.abs(kpi.monthUsage.delta)}일 전월 대비`
            : "전월 동기 대비 유사"
        }
        deltaDirection={
          kpi.monthUsage.delta > 0
            ? "up"
            : kpi.monthUsage.delta < 0
              ? "down"
              : "neutral"
        }
      />
    </KPIGrid>
  );
}

// ─── Calendar Tab ───────────────────────────────────────────

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function CalendarTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leave/calendar?year=${y}&month=${m}`);
      if (res.ok) {
        const json: CalendarData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(year, month);
  }, [year, month, fetchCalendar]);

  function handlePrevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  // Build calendar grid cells
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayDate = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : -1;
  const eventSet = new Set(data?.eventDays ?? []);

  const cells: { day: number; type: "normal" | "today" | "event" | "off" | "empty" }[] = [];

  // Leading empty cells
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ day: 0, type: "empty" });
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = (firstDayOfMonth + d - 1) % 7;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (d === todayDate) {
      cells.push({ day: d, type: "today" });
    } else if (eventSet.has(d)) {
      cells.push({ day: d, type: "event" });
    } else if (isWeekend) {
      cells.push({ day: d, type: "off" });
    } else {
      cells.push({ day: d, type: "normal" });
    }
  }

  const cellStyles: Record<string, string> = {
    normal: "bg-surface-primary text-text-primary",
    today: "bg-brand text-text-inverse font-bold",
    event: "bg-brand-soft text-brand-text",
    off: "bg-status-neutral-bg text-text-tertiary",
    empty: "",
  };

  return (
    <div className="grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
      {/* Calendar Card (2/3 width) */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>휴가 캘린더</CardTitle>
          <div className="flex items-center gap-sp-2">
            <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
              &larr;
            </Button>
            <span className="min-w-[100px] text-center text-sm font-semibold text-text-primary">
              {year}년 {MONTH_NAMES[month - 1]}
            </span>
            <Button variant="ghost" size="sm" onClick={handleNextMonth}>
              &rarr;
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-sp-12">
              <span className="text-sm text-text-tertiary">불러오는 중...</span>
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-px mb-px">
                {DAY_HEADERS.map((h) => (
                  <div
                    key={h}
                    className="py-sp-2 text-center text-xs font-semibold text-text-tertiary"
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px">
                {cells.map((cell, idx) => (
                  <div
                    key={idx}
                    className={[
                      "flex items-center justify-center rounded-sm py-sp-3 text-sm transition-colors duration-fast",
                      cell.type !== "empty" ? cellStyles[cell.type] : "",
                    ].join(" ")}
                  >
                    {cell.day > 0 ? cell.day : ""}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-sp-4 flex gap-sp-4 text-sm text-text-secondary">
                <span className="flex items-center gap-sp-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-brand-soft" />
                  휴가
                </span>
                <span className="flex items-center gap-sp-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-brand" />
                  오늘
                </span>
                <span className="flex items-center gap-sp-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-status-neutral-bg" />
                  주말/공휴일
                </span>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Today Absences Card (1/3 width) */}
      <Card>
        <CardHeader>
          <CardTitle>오늘 부재자</CardTitle>
          <Badge variant="info">{data?.todayAbsences.count ?? 0}명</Badge>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-sp-8">
              <span className="text-sm text-text-tertiary">불러오는 중...</span>
            </div>
          ) : data && data.todayAbsences.count > 0 ? (
            <QueueList>
              {data.todayAbsences.items.map((item, idx) => (
                <QueueItem
                  key={idx}
                  priority="low"
                  title={item.employeeName}
                  meta={`${item.department} · ${item.leaveType}`}
                />
              ))}
              {data.todayAbsences.remainingCount > 0 && (
                <QueueItem
                  priority="low"
                  title={`기타 ${data.todayAbsences.remainingCount}명`}
                  meta="전사 부서별 분포"
                />
              )}
            </QueueList>
          ) : (
            <div className="flex items-center justify-center py-sp-8">
              <span className="text-sm text-text-tertiary">오늘 부재자가 없습니다</span>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Placeholder Tab ────────────────────────────────────────

function PlaceholderTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-sp-12">
      <span className="text-sm text-text-tertiary">{message}</span>
    </div>
  );
}

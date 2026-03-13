"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
  ProgressBar,
} from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface EmployeeInfo {
  name: string;
  department: string;
  position: string;
  employeeNumber: string;
}

interface WorkStatus {
  checkIn: string | null;
  checkOut: string | null;
  workMinutes: number;
  status: string | null;
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  } | null;
}

interface CalendarDay {
  label: string;
  date: number;
  status: "present" | "absent" | "leave" | "none" | "today";
  isToday: boolean;
}

interface TodoItem {
  type: string;
  title: string;
  meta: string;
  priority: "critical" | "high" | "medium" | "low";
}

interface Stats {
  remainingLeave: number;
  totalLeave: number;
  usedLeave: number;
  weeklyHours: number;
  monthAttendance: number;
  monthlyOvertimeHours: number;
}

interface DashboardData {
  employee: EmployeeInfo;
  workStatus: WorkStatus;
  calendar: CalendarDay[];
  todos: TodoItem[];
  stats: Stats;
}

// ─── Helpers ────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getElapsedDisplay(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn) return "0시간 0분";
  const start = new Date(checkIn).getTime();
  const end = checkOut ? new Date(checkOut).getTime() : Date.now();
  const diffMin = Math.max(0, Math.floor((end - start) / 60000));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `${h}시간 ${m}분`;
}

function getRemainingDisplay(checkIn: string | null, shiftEnd: string | null): string {
  if (!checkIn || !shiftEnd) return "--";
  const now = new Date();
  const [eh, em] = shiftEnd.split(":").map(Number);
  const endTime = new Date(now);
  endTime.setHours(eh, em, 0, 0);
  const diff = endTime.getTime() - now.getTime();
  if (diff <= 0) return "퇴근 시간 경과";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}시간 ${m}분 남음`;
}

function getWorkStatusLabel(
  checkIn: string | null,
  checkOut: string | null,
): { text: string; variant: BadgeVariant } {
  if (!checkIn) return { text: "미출근", variant: "neutral" };
  if (checkIn && !checkOut) return { text: "근무중", variant: "success" };
  return { text: "퇴근", variant: "info" };
}

const calendarDayStyles: Record<string, string> = {
  present: "bg-status-success-bg text-status-success-text",
  absent: "bg-status-danger-bg text-status-danger-text",
  leave: "bg-status-warning-bg text-status-warning-text",
  none: "bg-surface-secondary text-text-tertiary",
  today: "bg-brand-soft text-brand-text ring-2 ring-brand",
};

const todoPriorityBadge: Record<string, BadgeVariant> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

// ─── Quick Action Buttons ───────────────────────────────────

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  variant: "primary" | "secondary" | "ghost" | "danger";
}

function getQuickActions(workStatus: WorkStatus): QuickAction[] {
  const actions: QuickAction[] = [];

  if (!workStatus.checkIn) {
    actions.push({ id: "checkin", label: "출근", icon: "→", variant: "primary" });
  } else if (!workStatus.checkOut) {
    actions.push({ id: "checkout", label: "퇴근", icon: "←", variant: "primary" });
  }

  actions.push(
    { id: "outing", label: "외근", icon: "↗", variant: "secondary" },
    { id: "leave", label: "휴가 신청", icon: "✦", variant: "secondary" },
    { id: "correction", label: "정정 신청", icon: "✎", variant: "ghost" },
  );

  return actions;
}

// ─── Component ──────────────────────────────────────────────

export default function EmployeeHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <EmployeeHomeContent />
    </Suspense>
  );
}

function EmployeeHomeContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/dashboard");
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Live timer update every 60s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const { employee, workStatus, calendar, todos, stats } = data;
  const statusBadge = getWorkStatusLabel(workStatus.checkIn, workStatus.checkOut);
  const quickActions = getQuickActions(workStatus);

  const todayStr = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // Work progress (for 8h standard day)
  const standardMinutes = 480;
  const elapsedMinutes = workStatus.checkIn
    ? Math.floor(
        ((workStatus.checkOut ? new Date(workStatus.checkOut).getTime() : now) -
          new Date(workStatus.checkIn).getTime()) /
          60000,
      )
    : 0;
  const workProgress = Math.min(
    Math.round((elapsedMinutes / standardMinutes) * 100),
    100,
  );

  return (
    <div className="mx-auto max-w-5xl">
      {/* ─── Work Status Hero ──────────────────────────────── */}
      <Card className="mb-sp-6 overflow-visible">
        <div className="bg-gradient-to-br from-brand-soft to-surface-primary p-sp-6 md:p-sp-8">
          <div className="flex flex-col gap-sp-4 md:flex-row md:items-start md:justify-between">
            {/* Left: Greeting + Status */}
            <div className="flex-1">
              <div className="flex items-center gap-sp-3">
                <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
                  {employee.name}님
                </h1>
                <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
              </div>
              <p className="mt-sp-1 text-sm text-text-secondary">
                {employee.department} · {employee.position} · {todayStr}
              </p>

              {/* Time Info */}
              <div className="mt-sp-4 flex flex-wrap items-end gap-sp-6">
                <div>
                  <span className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    출근 시간
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-text-primary">
                    {formatTime(workStatus.checkIn)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    근무 시간
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-text-primary">
                    {getElapsedDisplay(workStatus.checkIn, workStatus.checkOut)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    잔여 시간
                  </span>
                  <span className="text-lg font-semibold text-text-secondary">
                    {getRemainingDisplay(
                      workStatus.checkIn,
                      workStatus.shift?.endTime ?? null,
                    )}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {workStatus.checkIn && (
                <div className="mt-sp-4 max-w-md">
                  <ProgressBar
                    value={workProgress}
                    variant={workProgress >= 100 ? "success" : "brand"}
                    label={
                      workStatus.shift
                        ? `${workStatus.shift.startTime} – ${workStatus.shift.endTime}`
                        : "표준 근무"
                    }
                    showValue
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Right: Quick Actions */}
            <div className="flex flex-wrap gap-sp-2 md:flex-col md:items-end">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant}
                  size="sm"
                  className="min-w-[100px]"
                >
                  <span className="mr-sp-1">{action.icon}</span>
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Middle Row: Calendar + Todos ─────────────────── */}
      <div className="mb-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-2">
        {/* Weekly Mini Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>주간 캘린더</CardTitle>
            <span className="text-sm text-text-tertiary">이번 주</span>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-7 gap-sp-2">
              {calendar.map((day) => (
                <div key={day.label} className="flex flex-col items-center gap-sp-1">
                  <span className="text-xs font-medium text-text-tertiary">
                    {day.label}
                  </span>
                  <div
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      calendarDayStyles[day.status] ?? calendarDayStyles.none,
                    ].join(" ")}
                  >
                    {day.date}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="mt-sp-4 flex flex-wrap gap-sp-4 text-xs text-text-tertiary">
              <span className="flex items-center gap-sp-1">
                <span className="inline-block h-2 w-2 rounded-full bg-status-success-solid" />
                출근
              </span>
              <span className="flex items-center gap-sp-1">
                <span className="inline-block h-2 w-2 rounded-full bg-status-warning-solid" />
                휴가
              </span>
              <span className="flex items-center gap-sp-1">
                <span className="inline-block h-2 w-2 rounded-full bg-status-danger-solid" />
                결근
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Today's Todos */}
        <Card>
          <CardHeader>
            <CardTitle>오늘 할 일</CardTitle>
            <Badge variant="info">{todos.length}건</Badge>
          </CardHeader>
          <CardBody>
            {todos.length > 0 ? (
              <ul className="flex flex-col gap-sp-3">
                {todos.map((todo) => (
                  <li
                    key={todo.type}
                    className="flex items-start gap-sp-3 rounded-md border border-border-subtle p-sp-3"
                  >
                    <Badge variant={todoPriorityBadge[todo.priority] ?? "neutral"}>
                      {todo.priority === "critical"
                        ? "긴급"
                        : todo.priority === "high"
                          ? "높음"
                          : todo.priority === "medium"
                            ? "보통"
                            : "낮음"}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {todo.title}
                      </p>
                      <p className="text-xs text-text-tertiary">{todo.meta}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  오늘 할 일이 없습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ─── Bottom Row: Summary Stats ────────────────────── */}
      <div className="grid grid-cols-2 gap-sp-4 md:grid-cols-4">
        <Card>
          <CardBody className="text-center">
            <span className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
              잔여 연차
            </span>
            <span className="mt-sp-1 block text-3xl font-bold tabular-nums text-text-primary">
              {stats.remainingLeave}
            </span>
            <span className="text-xs text-text-tertiary">
              / {stats.totalLeave}일
            </span>
            <div className="mt-sp-2">
              <ProgressBar
                value={stats.usedLeave}
                max={stats.totalLeave || 1}
                variant={
                  stats.remainingLeave <= 3
                    ? "danger"
                    : stats.remainingLeave <= 5
                      ? "warning"
                      : "brand"
                }
                size="sm"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <span className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
              주간 근무
            </span>
            <span className="mt-sp-1 block text-3xl font-bold tabular-nums text-text-primary">
              {stats.weeklyHours}
            </span>
            <span className="text-xs text-text-tertiary">/ 40시간</span>
            <div className="mt-sp-2">
              <ProgressBar
                value={stats.weeklyHours}
                max={52}
                variant={
                  stats.weeklyHours >= 48
                    ? "danger"
                    : stats.weeklyHours >= 40
                      ? "warning"
                      : "brand"
                }
                size="sm"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <span className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
              이달 출근
            </span>
            <span className="mt-sp-1 block text-3xl font-bold tabular-nums text-text-primary">
              {stats.monthAttendance}
            </span>
            <span className="text-xs text-text-tertiary">일</span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <span className="block text-xs font-medium uppercase tracking-wider text-text-tertiary">
              이달 초과근무
            </span>
            <span className="mt-sp-1 block text-3xl font-bold tabular-nums text-text-primary">
              {stats.monthlyOvertimeHours}
            </span>
            <span className="text-xs text-text-tertiary">시간</span>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

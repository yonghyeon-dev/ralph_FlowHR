"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
} from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface TodayStatus {
  checkIn: string | null;
  checkOut: string | null;
  totalHours: string | null;
  shiftType: string;
  scheduledEnd: string;
  isWorking: boolean;
}

interface WeeklyScheduleRow {
  dayLabel: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  status: "normal" | "working" | "scheduled" | "late" | "absent" | "leave";
}

// ─── Mock Data ──────────────────────────────────────────────

const MOCK_TODAY: TodayStatus = {
  checkIn: "09:02",
  checkOut: null,
  totalHours: null,
  shiftType: "일반 근무",
  scheduledEnd: "18:00",
  isWorking: true,
};

function getMockWeeklySchedule(): WeeklyScheduleRow[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const dayLabels = ["월", "화", "수", "목", "금"];

  return dayLabels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    const isPast = d < today && !isToday;

    let status: WeeklyScheduleRow["status"] = "scheduled";
    if (isToday) status = "working";
    else if (isPast) status = "normal";

    return {
      dayLabel: isToday ? `${label} (오늘)` : label,
      date: `${m}월 ${day}일`,
      shiftType: "일반 근무",
      startTime: "09:00",
      endTime: "18:00",
      status,
    };
  });
}

// ─── Status Helpers ─────────────────────────────────────────

const STATUS_MAP: Record<
  WeeklyScheduleRow["status"],
  { label: string; variant: BadgeVariant }
> = {
  normal: { label: "정상", variant: "success" },
  working: { label: "근무 중", variant: "info" },
  scheduled: { label: "예정", variant: "neutral" },
  late: { label: "지각", variant: "warning" },
  absent: { label: "결근", variant: "danger" },
  leave: { label: "연차", variant: "neutral" },
};

// ─── StatRow ────────────────────────────────────────────────

function StatRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle py-sp-3 last:border-b-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span
        className={[
          "text-sm font-semibold",
          muted ? "text-text-tertiary" : "text-text-primary",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Clock Display ──────────────────────────────────────────

function useCurrentTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

// ─── Page Component ─────────────────────────────────────────

export default function SchedulePage() {
  const now = useCurrentTime();
  const [today, setToday] = useState<TodayStatus>(MOCK_TODAY);
  const weeklySchedule = useMemo(() => getMockWeeklySchedule(), []);

  function handleCheckOut() {
    const time = formatTime(new Date());
    setToday((prev) => ({
      ...prev,
      checkOut: time,
      isWorking: false,
      totalHours: calculateWorkHours(prev.checkIn, time),
    }));
  }

  function handleCheckIn() {
    const time = formatTime(new Date());
    setToday({
      checkIn: time,
      checkOut: null,
      totalHours: null,
      shiftType: "일반 근무",
      scheduledEnd: "18:00",
      isWorking: true,
    });
  }

  function calculateWorkHours(
    checkIn: string | null,
    checkOut: string | null,
  ): string | null {
    if (!checkIn || !checkOut) return null;
    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);
    const totalMinutes = outH * 60 + outM - (inH * 60 + inM);
    if (totalMinutes <= 0) return null;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}시간 ${String(minutes).padStart(2, "0")}분`;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-sp-6">
        <div className="mb-sp-1 text-sm text-text-tertiary">
          홈 &gt; 일정 · 근태
        </div>
        <h1 className="text-3xl font-bold text-text-primary">일정 · 근태</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          나의 근무 일정과 출퇴근 기록을 확인하세요
        </p>
      </div>

      {/* TE-101: Attendance Check Panel + Current Status */}
      <div className="mb-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
        {/* Check-in/out Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>출퇴근 체크</CardTitle>
            <Badge variant={today.isWorking ? "success" : "neutral"}>
              {today.isWorking ? "근무 중" : "퇴근"}
            </Badge>
          </CardHeader>
          <CardBody className="text-center">
            {/* Current Time Display */}
            <div className="mb-sp-2 text-[48px] font-bold leading-tight text-text-primary tabular-nums">
              {formatTime(now)}
            </div>
            <div className="mb-sp-6 text-sm text-text-tertiary">
              {formatDate(now)}
            </div>

            {/* Check-in / Check-out Buttons */}
            <div className="flex items-center justify-center gap-sp-4">
              <Button
                variant="secondary"
                size="lg"
                disabled={today.checkIn !== null}
                onClick={handleCheckIn}
                className="min-w-[140px]"
              >
                <div>
                  출근
                  {today.checkIn && (
                    <span className="block text-xs text-text-tertiary">
                      {today.checkIn} 완료
                    </span>
                  )}
                </div>
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={!today.isWorking || today.checkIn === null}
                onClick={handleCheckOut}
                className="min-w-[140px]"
              >
                퇴근
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Today Status */}
        <Card>
          <CardHeader>
            <CardTitle>오늘 현황</CardTitle>
          </CardHeader>
          <CardBody>
            <StatRow
              label="출근"
              value={today.checkIn ?? "—"}
              muted={!today.checkIn}
            />
            <StatRow
              label="퇴근"
              value={today.checkOut ?? "—"}
              muted={!today.checkOut}
            />
            <StatRow
              label="총 근무시간"
              value={today.totalHours ?? "—"}
              muted={!today.totalHours}
            />
            <StatRow label="근무 유형" value={today.shiftType} />
            <StatRow label="예정 퇴근" value={today.scheduledEnd} />
          </CardBody>
        </Card>
      </div>

      {/* TE-102: Weekly Schedule Table */}
      <div className="mb-sp-4">
        <h2 className="text-xl font-semibold text-text-primary">
          이번 주 근무 일정
        </h2>
        <p className="mt-sp-1 text-sm text-text-tertiary">
          {getWeekRangeLabel()}
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-sp-4 py-sp-3 text-left font-medium text-text-secondary w-[100px]">
                  요일
                </th>
                <th className="px-sp-4 py-sp-3 text-left font-medium text-text-secondary">
                  날짜
                </th>
                <th className="px-sp-4 py-sp-3 text-left font-medium text-text-secondary">
                  근무 유형
                </th>
                <th className="px-sp-4 py-sp-3 text-left font-medium text-text-secondary">
                  시작
                </th>
                <th className="px-sp-4 py-sp-3 text-left font-medium text-text-secondary">
                  종료
                </th>
                <th className="px-sp-4 py-sp-3 text-left font-medium text-text-secondary">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {weeklySchedule.map((row) => {
                const statusInfo = STATUS_MAP[row.status];
                const isToday = row.status === "working";
                return (
                  <tr
                    key={row.dayLabel}
                    className={[
                      "border-b border-border-subtle last:border-b-0",
                      isToday ? "bg-brand-soft/30" : "",
                    ].join(" ")}
                  >
                    <td className="px-sp-4 py-sp-3 font-semibold text-text-primary">
                      {row.dayLabel}
                    </td>
                    <td className="px-sp-4 py-sp-3 text-text-primary">
                      {row.date}
                    </td>
                    <td className="px-sp-4 py-sp-3 text-text-primary">
                      {row.shiftType}
                    </td>
                    <td className="px-sp-4 py-sp-3 tabular-nums text-text-primary">
                      {row.startTime}
                    </td>
                    <td className="px-sp-4 py-sp-3 tabular-nums text-text-primary">
                      {row.endTime}
                    </td>
                    <td className="px-sp-4 py-sp-3">
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function getWeekRangeLabel(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const year = monday.getFullYear();
  const weekNum = getWeekNumber(monday);
  const mStart = monday.getMonth() + 1;
  const dStart = monday.getDate();
  const mEnd = friday.getMonth() + 1;
  const dEnd = friday.getDate();

  return `${year}년 ${mStart}월 ${weekNum}주차 (${mStart}/${dStart} ~ ${mEnd}/${dEnd})`;
}

function getWeekNumber(date: Date): number {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDay = startOfMonth.getDay() || 7;
  const dayOfMonth = date.getDate();
  return Math.ceil((dayOfMonth + startDay - 1) / 7);
}

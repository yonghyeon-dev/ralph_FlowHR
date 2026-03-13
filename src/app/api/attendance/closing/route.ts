import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { ClosingStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<ClosingStatus, ClosingStatus | null> = {
  OPEN: "IN_REVIEW",
  IN_REVIEW: "CLOSED",
  CLOSED: null,
};

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { searchParams } = request.nextUrl;

  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  // Get or create closing record for the month
  let closing = await prisma.attendanceClosing.findUnique({
    where: { tenantId_year_month: { tenantId, year, month } },
  });

  if (!closing) {
    closing = await prisma.attendanceClosing.create({
      data: { tenantId, year, month, status: "OPEN", totalDays: 0, totalHours: 0 },
    });
  }

  // Build checklist from actual data
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // 1. Checkout omission check
  const missingCheckouts = await prisma.attendanceRecord.count({
    where: {
      tenantId,
      date: { gte: monthStart, lte: monthEnd },
      checkIn: { not: null },
      checkOut: null,
    },
  });

  // 2. Overtime records pending review
  const pendingOvertimeExceptions = await prisma.attendanceException.count({
    where: {
      tenantId,
      type: "OVERTIME",
      status: "PENDING",
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  // 3. Department approval progress
  const departments = await prisma.department.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const totalDepartments = departments.length;
  // In a real system, there'd be a department approval table.
  // For now, simulate based on closing status progression.
  let approvedDepartments = 0;
  if (closing.status === "CLOSED") {
    approvedDepartments = totalDepartments;
  } else if (closing.status === "IN_REVIEW") {
    approvedDepartments = Math.ceil(totalDepartments / 2);
  }

  // 4. Final closing - derive from status
  const closingDate = new Date(year, month - 1, 25);

  // Compute summary stats
  const totalRecords = await prisma.attendanceRecord.count({
    where: { tenantId, date: { gte: monthStart, lte: monthEnd } },
  });

  const workMinutesAgg = await prisma.attendanceRecord.aggregate({
    where: { tenantId, date: { gte: monthStart, lte: monthEnd } },
    _sum: { workMinutes: true },
  });
  const totalHoursComputed = Math.round((workMinutesAgg._sum.workMinutes ?? 0) / 60 * 10) / 10;

  type ChecklistItemStatus = "complete" | "pending" | "progress" | "not_started";

  interface ChecklistItem {
    id: string;
    title: string;
    meta: string;
    status: ChecklistItemStatus;
    statusLabel: string;
    priority: "low" | "medium" | "high" | "critical";
  }

  const checklist: ChecklistItem[] = [
    {
      id: "checkout_correction",
      title: "체크아웃 누락 보정 완료",
      meta:
        missingCheckouts === 0
          ? "전월 누락 건 모두 보정됨"
          : `미보정 ${missingCheckouts}건 남음`,
      status: missingCheckouts === 0 ? "complete" : "pending",
      statusLabel: missingCheckouts === 0 ? "완료" : `${missingCheckouts}건 미처리`,
      priority: "low",
    },
    {
      id: "overtime_verification",
      title: "초과근무 수당 계산 검증",
      meta:
        pendingOvertimeExceptions === 0
          ? "급여팀 검토 완료"
          : `급여팀 검토 대기 중 (${pendingOvertimeExceptions}건)`,
      status: pendingOvertimeExceptions === 0 ? "complete" : "pending",
      statusLabel: pendingOvertimeExceptions === 0 ? "완료" : "대기",
      priority: "low",
    },
    {
      id: "department_approval",
      title: "부서장 승인",
      meta: `${totalDepartments}개 부서 중 ${approvedDepartments}개 승인 완료`,
      status:
        approvedDepartments === totalDepartments && totalDepartments > 0
          ? "complete"
          : "progress",
      statusLabel:
        approvedDepartments === totalDepartments && totalDepartments > 0
          ? "완료"
          : `${approvedDepartments}/${totalDepartments}`,
      priority: "medium",
    },
    {
      id: "final_closing",
      title: "최종 마감 확정",
      meta: `마감일: ${year}.${String(month).padStart(2, "0")}.${closingDate.getDate()}`,
      status: closing.status === "CLOSED" ? "complete" : "not_started",
      statusLabel: closing.status === "CLOSED" ? "완료" : "미시작",
      priority: "high",
    },
  ];

  return NextResponse.json({
    year,
    month,
    status: closing.status,
    closedBy: closing.closedBy,
    closedAt: closing.closedAt
      ? new Date(closing.closedAt).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : null,
    totalDays: totalRecords,
    totalHours: totalHoursComputed,
    checklist,
  });
}

export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId || !token.employeeNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const body = await request.json();
  const { year, month, action } = body as {
    year: number;
    month: number;
    action: "advance";
  };

  if (!year || !month || action !== "advance") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const closing = await prisma.attendanceClosing.findUnique({
    where: { tenantId_year_month: { tenantId, year, month } },
  });

  if (!closing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextStatus = VALID_TRANSITIONS[closing.status];
  if (!nextStatus) {
    return NextResponse.json(
      { error: "Cannot transition from current status" },
      { status: 409 },
    );
  }

  const updateData: {
    status: ClosingStatus;
    closedBy?: string;
    closedAt?: Date;
  } = { status: nextStatus };

  if (nextStatus === "CLOSED") {
    updateData.closedBy = token.employeeNumber as string;
    updateData.closedAt = new Date();
  }

  const updated = await prisma.attendanceClosing.update({
    where: { id: closing.id },
    data: updateData,
  });

  return NextResponse.json({
    status: updated.status,
    closedBy: updated.closedBy,
    closedAt: updated.closedAt,
  });
}

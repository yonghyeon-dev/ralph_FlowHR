import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId;
  const userId = token.id;

  // Find employee linked to this user
  const employee = await prisma.employee.findFirst({
    where: { tenantId, userId },
    include: {
      department: { select: { name: true } },
      position: { select: { name: true } },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // ─── Work Status ─────────────────────────────────────────
  const todayRecord = await prisma.attendanceRecord.findFirst({
    where: {
      tenantId,
      employeeId: employee.id,
      date: { gte: today, lt: tomorrow },
    },
  });

  // Current shift assignment
  const shiftAssignment = await prisma.shiftAssignment.findFirst({
    where: {
      tenantId,
      employeeId: employee.id,
      startDate: { lte: tomorrow },
      OR: [{ endDate: null }, { endDate: { gte: today } }],
    },
    include: { shift: true },
    orderBy: { startDate: "desc" },
  });

  const shift = shiftAssignment?.shift ?? null;

  // ─── Weekly Mini Calendar (Mon–Sun) ──────────────────────
  const dayOfWeek = today.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekRecords = await prisma.attendanceRecord.findMany({
    where: {
      tenantId,
      employeeId: employee.id,
      date: { gte: weekStart, lt: weekEnd },
    },
    select: { date: true, status: true, workMinutes: true },
    orderBy: { date: "asc" },
  });

  const weekLeaves = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      employeeId: employee.id,
      status: { in: ["APPROVED", "PENDING"] },
      startDate: { lte: weekEnd },
      endDate: { gte: weekStart },
    },
    select: { startDate: true, endDate: true, status: true },
  });

  const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
  const calendar = DAY_LABELS.map((label, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const record = weekRecords.find(
      (r) => r.date.toISOString().slice(0, 10) === dateStr,
    );
    const hasLeave = weekLeaves.some((lr) => {
      const start = lr.startDate.toISOString().slice(0, 10);
      const end = lr.endDate.toISOString().slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });
    const isToday = dateStr === today.toISOString().slice(0, 10);

    let status: "present" | "absent" | "leave" | "none" | "today" = "none";
    if (hasLeave) status = "leave";
    else if (record) status = record.status === "ABSENT" ? "absent" : "present";
    if (isToday && status === "none") status = "today";

    return {
      label,
      date: date.getDate(),
      status,
      isToday,
    };
  });

  // ─── Todos (pending items for employee) ──────────────────
  interface TodoItem {
    type: string;
    title: string;
    meta: string;
    priority: "critical" | "high" | "medium" | "low";
  }

  const todos: TodoItem[] = [];

  // Pending leave requests
  const pendingLeaves = await prisma.leaveRequest.count({
    where: { tenantId, employeeId: employee.id, status: "PENDING" },
  });
  if (pendingLeaves > 0) {
    todos.push({
      type: "leave",
      title: `휴가 승인 대기 ${pendingLeaves}건`,
      meta: "승인 결과를 기다리는 중",
      priority: "medium",
    });
  }

  // Pending attendance exceptions
  const pendingExceptions = await prisma.attendanceException.count({
    where: { tenantId, employeeId: employee.id, status: "PENDING" },
  });
  if (pendingExceptions > 0) {
    todos.push({
      type: "exception",
      title: `근태 정정 대기 ${pendingExceptions}건`,
      meta: "승인 처리 중",
      priority: "medium",
    });
  }

  // Unsigned documents
  const unsignedDocs = await prisma.document.count({
    where: { tenantId, recipientId: employee.id, status: "SENT" },
  });
  if (unsignedDocs > 0) {
    todos.push({
      type: "document",
      title: `서명 대기 문서 ${unsignedDocs}건`,
      meta: "문서 확인 및 서명 필요",
      priority: "high",
    });
  }

  // Pending evaluations
  const pendingEvals = await prisma.evaluation.count({
    where: {
      tenantId,
      employeeId: employee.id,
      status: { in: ["NOT_STARTED", "SELF_REVIEW"] },
    },
  });
  if (pendingEvals > 0) {
    todos.push({
      type: "evaluation",
      title: `평가 작성 필요 ${pendingEvals}건`,
      meta: "자기평가 또는 동료평가",
      priority: "medium",
    });
  }

  // Onboarding tasks
  const pendingOnboarding = await prisma.onboardingTask.count({
    where: {
      tenantId,
      employeeId: employee.id,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });
  if (pendingOnboarding > 0) {
    todos.push({
      type: "onboarding",
      title: `온보딩 미완료 ${pendingOnboarding}건`,
      meta: "체크리스트 확인",
      priority: "high",
    });
  }

  // No checkout today
  if (todayRecord?.checkIn && !todayRecord.checkOut) {
    todos.push({
      type: "checkout",
      title: "퇴근 체크아웃 미완료",
      meta: "오늘 퇴근 기록이 없습니다",
      priority: "low",
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  todos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // ─── Summary Statistics ──────────────────────────────────
  const currentYear = today.getFullYear();

  // Leave balance
  const leaveBalances = await prisma.leaveBalance.findMany({
    where: { tenantId, employeeId: employee.id, year: currentYear },
    include: { policy: { select: { name: true, type: true } } },
  });

  const annualBalance = leaveBalances.find((b) => b.policy.type === "ANNUAL");
  const totalLeave = annualBalance?.totalDays ?? 0;
  const usedLeave = annualBalance?.usedDays ?? 0;
  const remainingLeave = totalLeave - usedLeave;

  // Weekly work hours
  const weeklyMinutes = weekRecords.reduce(
    (sum, r) => sum + (r.workMinutes ?? 0),
    0,
  );
  const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;

  // Monthly attendance count
  const monthStart = new Date(currentYear, today.getMonth(), 1);
  const monthEnd = new Date(currentYear, today.getMonth() + 1, 1);
  const monthAttendance = await prisma.attendanceRecord.count({
    where: {
      tenantId,
      employeeId: employee.id,
      date: { gte: monthStart, lt: monthEnd },
      status: { not: "ABSENT" },
    },
  });

  // Monthly overtime
  const monthRecords = await prisma.attendanceRecord.findMany({
    where: {
      tenantId,
      employeeId: employee.id,
      date: { gte: monthStart, lt: monthEnd },
    },
    select: { overtime: true },
  });
  const monthlyOvertime = monthRecords.reduce(
    (sum, r) => sum + (r.overtime ?? 0),
    0,
  );
  const monthlyOvertimeHours = Math.round((monthlyOvertime / 60) * 10) / 10;

  return NextResponse.json({
    employee: {
      name: employee.name,
      department: employee.department?.name ?? "",
      position: employee.position?.name ?? "",
      employeeNumber: employee.employeeNumber,
    },
    workStatus: {
      checkIn: todayRecord?.checkIn?.toISOString() ?? null,
      checkOut: todayRecord?.checkOut?.toISOString() ?? null,
      workMinutes: todayRecord?.workMinutes ?? 0,
      status: todayRecord?.status ?? null,
      shift: shift
        ? {
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
          }
        : null,
    },
    calendar,
    todos,
    stats: {
      remainingLeave,
      totalLeave,
      usedLeave,
      weeklyHours,
      monthAttendance,
      monthlyOvertimeHours,
    },
  });
}

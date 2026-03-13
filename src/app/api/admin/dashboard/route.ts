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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // ─── KPI 1: 승인 필요 ────────────────────────────────────
  const pendingApprovals = await prisma.approvalRequest.count({
    where: { tenantId, status: "PENDING" },
  });
  const yesterdayApprovals = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: "PENDING",
      createdAt: { lt: today },
    },
  });
  const approvalDelta = pendingApprovals - yesterdayApprovals;

  // ─── KPI 2: 근태 이상 (체크아웃 누락) ───────────────────
  const checkoutMissing = await prisma.attendanceRecord.count({
    where: {
      tenantId,
      date: { gte: today, lt: tomorrow },
      checkIn: { not: null },
      checkOut: null,
    },
  });
  const yesterdayMissing = await prisma.attendanceRecord.count({
    where: {
      tenantId,
      date: { gte: yesterday, lt: today },
      checkIn: { not: null },
      checkOut: null,
    },
  });
  const missingDelta = checkoutMissing - yesterdayMissing;

  // ─── KPI 3: 근로 시간 (52h 임박) ────────────────────────
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);

  const weekRecords = await prisma.attendanceRecord.findMany({
    where: {
      tenantId,
      date: { gte: weekStart, lt: tomorrow },
    },
    select: { employeeId: true, workMinutes: true },
  });

  const weeklyByEmployee = new Map<string, number>();
  for (const r of weekRecords) {
    const cur = weeklyByEmployee.get(r.employeeId) ?? 0;
    weeklyByEmployee.set(r.employeeId, cur + (r.workMinutes ?? 0));
  }
  const overtimeNear = Array.from(weeklyByEmployee.values()).filter(
    (mins) => mins >= 2880, // 48h+
  ).length;

  // ─── KPI 4: 문서 (서명 대기) ─────────────────────────────
  const unsignedDocs = await prisma.document.count({
    where: { tenantId, status: "SENT" },
  });
  const yesterdayUnsigned = await prisma.document.count({
    where: {
      tenantId,
      status: "SENT",
      createdAt: { lt: today },
    },
  });
  const docsDelta = unsignedDocs - yesterdayUnsigned;

  // ─── KPI 5: 마감 병목 ────────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const openClosings = await prisma.attendanceClosing.count({
    where: {
      tenantId,
      year: currentYear,
      month: currentMonth,
      status: { not: "CLOSED" },
    },
  });
  const openPayrolls = await prisma.payrollRun.count({
    where: {
      tenantId,
      year: currentYear,
      month: currentMonth,
      status: { notIn: ["CONFIRMED", "CANCELLED"] },
    },
  });
  const closingBottleneck = openClosings + openPayrolls;

  // ─── 오늘의 대기열 ───────────────────────────────────────
  const todayExceptions = await prisma.attendanceException.findMany({
    where: { tenantId, status: "PENDING" },
    include: {
      employee: { select: { name: true, department: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const pendingLeaves = await prisma.leaveRequest.count({
    where: { tenantId, status: "PENDING" },
  });

  const pendingDocsSent = await prisma.document.count({
    where: { tenantId, status: "SENT" },
  });

  interface QueueItemData {
    priority: "critical" | "high" | "medium" | "low";
    title: string;
    meta: string;
    actionLabel: string;
  }

  const queueItems: QueueItemData[] = [];

  // Overtime near limit
  if (overtimeNear > 0) {
    queueItems.push({
      priority: "critical",
      title: `초과근무 상한 도달 — ${overtimeNear}명`,
      meta: "주 52시간 초과 임박 · 즉시 조치 필요",
      actionLabel: "조치",
    });
  }

  // Missing checkouts
  if (checkoutMissing > 0) {
    const missingByDept = todayExceptions.reduce(
      (acc: Record<string, number>, e) => {
        const dept = e.employee.department?.name ?? "기타";
        acc[dept] = (acc[dept] ?? 0) + 1;
        return acc;
      },
      {},
    );
    const deptSummary = Object.entries(missingByDept)
      .slice(0, 3)
      .map(([dept, count]) => `${dept} ${count}건`)
      .join(", ");

    queueItems.push({
      priority: "high",
      title: `체크아웃 누락 ${checkoutMissing}건`,
      meta: deptSummary || "근태 확인 필요",
      actionLabel: "확인",
    });
  }

  // Pending leave requests
  if (pendingLeaves > 0) {
    queueItems.push({
      priority: "medium",
      title: `휴가 요청 미처리 ${pendingLeaves}건`,
      meta: "대기 중인 요청 포함 · SLA 경과 가능",
      actionLabel: "처리",
    });
  }

  // Unsigned documents
  if (pendingDocsSent > 0) {
    queueItems.push({
      priority: "medium",
      title: `미서명 문서 ${pendingDocsSent}건`,
      meta: "서명 대기 중인 문서",
      actionLabel: "알림 발송",
    });
  }

  // ─── 조직 스냅샷 ─────────────────────────────────────────
  const departments = await prisma.department.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      employees: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
  });

  const todayRecords = await prisma.attendanceRecord.findMany({
    where: {
      tenantId,
      date: { gte: today, lt: tomorrow },
    },
    select: { employeeId: true },
  });

  const presentSet = new Set(todayRecords.map((r) => r.employeeId));

  const orgSnapshot = departments
    .filter((d) => d.employees.length > 0)
    .map((dept) => {
      const total = dept.employees.length;
      const present = dept.employees.filter((e) => presentSet.has(e.id)).length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return { name: dept.name, rate, present, total };
    })
    .sort((a, b) => b.rate - a.rate);

  // Signals
  const dangerDepts = orgSnapshot.filter((d) => d.rate < 85);
  const warningDepts = orgSnapshot.filter((d) => d.rate >= 85 && d.rate < 95);

  // ─── 승인 퍼널 ───────────────────────────────────────────
  const approvalsByStatus = await prisma.approvalRequest.groupBy({
    by: ["status"],
    where: { tenantId },
    _count: true,
  });

  const funnelMap: Record<string, number> = {};
  for (const g of approvalsByStatus) {
    funnelMap[g.status] = g._count;
  }

  const funnelData = [
    { stage: "초안", count: funnelMap["PENDING"] ?? 0 },
    { stage: "승인 대기", count: funnelMap["IN_PROGRESS"] ?? 0 },
    { stage: "상향 결재", count: funnelMap["ESCALATED"] ?? 0 },
    { stage: "완료", count: (funnelMap["APPROVED"] ?? 0) + (funnelMap["REJECTED"] ?? 0) },
  ];

  const totalFunnel = funnelData.reduce((s, f) => s + f.count, 0);

  // Average processing time (completed requests)
  const completedRequests = await prisma.approvalRequest.findMany({
    where: {
      tenantId,
      status: { in: ["APPROVED", "REJECTED"] },
      completedAt: { not: null },
    },
    select: { createdAt: true, completedAt: true },
    take: 50,
    orderBy: { completedAt: "desc" },
  });

  let avgProcessDays = 0;
  if (completedRequests.length > 0) {
    const totalDays = completedRequests.reduce((sum, r) => {
      const diff =
        (r.completedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + diff;
    }, 0);
    avgProcessDays = Math.round((totalDays / completedRequests.length) * 10) / 10;
  }

  const slaOverdue = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      createdAt: {
        lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days
      },
    },
  });

  // ─── 예외 모니터 ─────────────────────────────────────────
  const todayAllExceptions = await prisma.attendanceException.groupBy({
    by: ["type"],
    where: {
      tenantId,
      date: { gte: today, lt: tomorrow },
    },
    _count: true,
  });

  interface ExceptionMonitorItem {
    type: string;
    label: string;
    count: number;
    priority: "critical" | "high" | "medium" | "low";
    meta: string;
  }

  const exceptionTypeInfo: Record<
    string,
    { label: string; priority: "critical" | "high" | "medium" | "low"; meta: string }
  > = {
    CORRECTION: {
      label: "지각",
      priority: "high",
      meta: "근태 정정 요청",
    },
    OVERTIME: {
      label: "초과근무",
      priority: "critical",
      meta: "근로기준법 준수 확인 필요",
    },
    BUSINESS_TRIP: {
      label: "출장",
      priority: "medium",
      meta: "출장 기록 확인",
    },
    REMOTE_WORK: {
      label: "기록 충돌",
      priority: "medium",
      meta: "출퇴근 기록과 시스템 기록 불일치",
    },
  };

  const exceptionMonitor: ExceptionMonitorItem[] = todayAllExceptions
    .map((e) => {
      const info = exceptionTypeInfo[e.type] ?? {
        label: e.type,
        priority: "low" as const,
        meta: "",
      };
      return {
        type: e.type,
        label: info.label,
        count: e._count,
        priority: info.priority,
        meta: info.meta,
      };
    })
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    });

  // ─── 문서 현황 ───────────────────────────────────────────
  const unsignedTotal = await prisma.document.count({
    where: { tenantId, status: "SENT" },
  });

  const urgentDocs = await prisma.document.count({
    where: {
      tenantId,
      status: "SENT",
      deadline: {
        lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        gte: today,
      },
    },
  });

  const expiringContracts = await prisma.document.count({
    where: {
      tenantId,
      status: { in: ["SIGNED"] },
      deadline: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        gte: today,
      },
    },
  });

  // ─── 급여 현황 ───────────────────────────────────────────
  const currentPayroll = await prisma.payrollRun.findFirst({
    where: {
      tenantId,
      year: currentYear,
      month: currentMonth,
    },
    select: { status: true, currentStep: true },
  });

  const reissueRequests = await prisma.payslip.count({
    where: { tenantId, status: "REISSUE_REQUESTED" },
  });

  const payrollChanges = currentPayroll
    ? currentPayroll.status !== "CONFIRMED"
      ? 1
      : 0
    : 0;

  return NextResponse.json({
    kpi: {
      pendingApprovals: {
        value: pendingApprovals,
        delta: approvalDelta,
      },
      attendanceIssues: {
        value: checkoutMissing,
        delta: missingDelta,
      },
      overtimeNear: {
        value: overtimeNear,
      },
      unsignedDocs: {
        value: unsignedDocs,
        delta: docsDelta,
      },
      closingBottleneck: {
        value: closingBottleneck,
      },
    },
    todayQueue: queueItems,
    orgSnapshot: {
      departments: orgSnapshot,
      signals: {
        danger: dangerDepts.map((d) => `${d.name} ${d.total - d.present}건`),
        warning: warningDepts.map((d) => `${d.name} ${d.total - d.present}건`),
      },
    },
    approvalFunnel: {
      data: funnelData,
      total: totalFunnel,
      avgProcessDays,
      slaOverdue,
    },
    exceptionMonitor,
    documentStatus: {
      unsigned: unsignedTotal,
      urgent: urgentDocs,
      expiringContracts,
    },
    payrollStatus: {
      changes: payrollChanges,
      currentStep: currentPayroll?.currentStep ?? 0,
      currentStatus: currentPayroll?.status ?? "NONE",
      reissueRequests,
    },
  });
}

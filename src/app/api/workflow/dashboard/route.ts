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
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Week start (Monday)
  const weekStart = new Date(today);
  const dayOfWeek = weekStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + mondayOffset);

  // SLA threshold: 48 hours ago
  const slaThreshold = new Date(now);
  slaThreshold.setHours(slaThreshold.getHours() - 48);

  // ── KPI 1: 승인 대기 (Pending approvals) ─────────────────
  const pendingCount = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });

  // ── KPI 2: SLA 초과 (SLA exceeded, 48h+) ─────────────────
  const slaExceededCount = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      createdAt: { lt: slaThreshold },
    },
  });

  // Previous day SLA for delta
  const slaThresholdYesterday = new Date(slaThreshold);
  slaThresholdYesterday.setDate(slaThresholdYesterday.getDate() - 1);
  const slaExceededYesterday = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      createdAt: { lt: slaThresholdYesterday },
    },
  });
  const slaDelta = slaExceededCount - slaExceededYesterday;

  // ── KPI 3: 상향 결재 (Escalations) ───────────────────────
  const escalationCount = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: "ESCALATED",
    },
  });

  // ── KPI 4: 이번 주 완료 (This week completed) ────────────
  const weeklyCompleteCount = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: { in: ["APPROVED", "REJECTED"] },
      completedAt: { gte: weekStart },
    },
  });

  // ── Inbox: 승인 대기열 ─────────────────────────────────────
  const pendingRequests = await prisma.approvalRequest.findMany({
    where: {
      tenantId,
      status: { in: ["PENDING", "IN_PROGRESS", "ESCALATED"] },
    },
    orderBy: [
      { priority: "asc" },
      { createdAt: "asc" },
    ],
    take: 10,
    include: {
      requester: {
        select: {
          name: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  const inbox = pendingRequests.map((req) => {
    const department = req.requester.department?.name ?? "";
    const daysSinceCreated = Math.floor(
      (now.getTime() - req.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const slaExceeded = daysSinceCreated >= 2;

    return {
      id: req.id,
      title: req.title,
      department,
      meta: req.description ?? "",
      priority: req.priority.toLowerCase() as "critical" | "high" | "medium" | "low",
      requestType: req.requestType,
      slaExceeded,
      daysPending: daysSinceCreated,
    };
  });

  // ── Stats: 처리 현황 ──────────────────────────────────────
  // Average processing time (completed requests)
  const completedRequests = await prisma.approvalRequest.findMany({
    where: {
      tenantId,
      status: { in: ["APPROVED", "REJECTED"] },
      completedAt: { not: null },
    },
    select: { createdAt: true, completedAt: true, requestType: true },
    orderBy: { completedAt: "desc" },
    take: 50,
  });

  let avgProcessDays = 0;
  if (completedRequests.length > 0) {
    const totalMs = completedRequests.reduce((sum, r) => {
      const diff = (r.completedAt!.getTime() - r.createdAt.getTime());
      return sum + diff;
    }, 0);
    avgProcessDays =
      Math.round((totalMs / completedRequests.length / (1000 * 60 * 60 * 24)) * 10) / 10;
  }

  // Today processed
  const todayProcessed = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: { in: ["APPROVED", "REJECTED"] },
      completedAt: { gte: today, lt: tomorrow },
    },
  });

  // Auto-approved (step count = 1 and approved)
  const autoApproved = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: "APPROVED",
      completedAt: { gte: weekStart },
      steps: { every: { status: "APPROVED" } },
    },
  });

  // Rejection rate
  const totalRejected = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: "REJECTED",
      completedAt: { not: null },
    },
  });
  const totalAll = await prisma.approvalRequest.count({
    where: {
      tenantId,
      status: { in: ["APPROVED", "REJECTED"] },
      completedAt: { not: null },
    },
  });
  const rejectionRate = totalAll > 0
    ? Math.round((totalRejected / totalAll) * 1000) / 10
    : 0;

  // Slowest request type by average processing time
  const typeProcessTimes: Record<string, { total: number; count: number }> = {};
  for (const r of completedRequests) {
    const diff = r.completedAt!.getTime() - r.createdAt.getTime();
    if (!typeProcessTimes[r.requestType]) {
      typeProcessTimes[r.requestType] = { total: 0, count: 0 };
    }
    typeProcessTimes[r.requestType].total += diff;
    typeProcessTimes[r.requestType].count += 1;
  }

  const typeLabels: Record<string, string> = {
    LEAVE: "휴가",
    EXPENSE: "경비 정산",
    OVERTIME: "초과근무",
    SALARY_CHANGE: "연봉 변경",
  };

  let slowestType = "없음";
  let maxAvg = 0;
  for (const [type, data] of Object.entries(typeProcessTimes)) {
    const avg = data.total / data.count;
    if (avg > maxAvg) {
      maxAvg = avg;
      slowestType = typeLabels[type] ?? type;
    }
  }

  return NextResponse.json({
    kpi: {
      pending: pendingCount,
      slaExceeded: slaExceededCount,
      slaDelta,
      escalations: escalationCount,
      weeklyComplete: weeklyCompleteCount,
    },
    inbox,
    stats: {
      avgProcessDays,
      todayProcessed,
      autoApproved,
      rejectionRate,
      slowestType,
    },
  });
}

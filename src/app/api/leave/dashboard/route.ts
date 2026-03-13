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
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // ── KPI 1: 오늘 휴가 (Today's absences) ─────────────────────
  const todayAbsences = await prisma.leaveRequest.count({
    where: {
      tenantId,
      status: "APPROVED",
      startDate: { lte: now },
      endDate: { gte: today },
    },
  });

  // ── KPI 2: 대기 중 요청 (Pending requests) ──────────────────
  const pendingRequests = await prisma.leaveRequest.count({
    where: { tenantId, status: "PENDING" },
  });

  // Yesterday's pending for delta
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const pendingCreatedYesterday = await prisma.leaveRequest.count({
    where: {
      tenantId,
      status: "PENDING",
      createdAt: { lt: today },
    },
  });
  const pendingDelta = pendingRequests - pendingCreatedYesterday;

  // ── KPI 3: 잔여 연차 평균 (Avg remaining annual leave) ──────
  const annualBalances = await prisma.leaveBalance.findMany({
    where: {
      tenantId,
      year: currentYear,
      policy: { type: "ANNUAL" },
    },
    select: {
      totalDays: true,
      usedDays: true,
      pendingDays: true,
    },
  });

  const totalRemaining = annualBalances.reduce(
    (sum, b) => sum + (b.totalDays - b.usedDays - b.pendingDays),
    0,
  );
  const avgRemaining =
    annualBalances.length > 0
      ? Math.round((totalRemaining / annualBalances.length) * 10) / 10
      : 0;

  // ── KPI 4: 이번 달 사용 (This month's usage) ────────────────
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 1);

  const monthRequests = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      startDate: { lt: monthEnd },
      endDate: { gte: monthStart },
    },
    select: { days: true },
  });

  const monthUsedDays = monthRequests.reduce((sum, r) => sum + r.days, 0);

  // Previous month for delta
  const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthEnd = monthStart;

  const prevMonthRequests = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      startDate: { lt: prevMonthEnd },
      endDate: { gte: prevMonthStart },
    },
    select: { days: true },
  });

  const prevMonthUsedDays = prevMonthRequests.reduce(
    (sum, r) => sum + r.days,
    0,
  );
  const monthDelta = monthUsedDays - prevMonthUsedDays;

  return NextResponse.json({
    kpi: {
      todayAbsences: {
        count: todayAbsences,
      },
      pendingRequests: {
        count: pendingRequests,
        delta: pendingDelta,
      },
      avgRemaining: {
        days: avgRemaining,
        employeeCount: annualBalances.length,
      },
      monthUsage: {
        days: monthUsedDays,
        delta: monthDelta,
      },
    },
  });
}

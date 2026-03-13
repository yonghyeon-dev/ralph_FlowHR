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
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 1);

  // Week boundaries (Monday-based)
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  // 7 days from now for expiring
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  // ── KPI 1: 발송 완료 (Sent this month) ─────────────────────
  const sentCount = await prisma.document.count({
    where: {
      tenantId,
      status: { in: ["SENT", "VIEWED", "SIGNED"] },
      sentAt: { gte: monthStart, lt: monthEnd },
    },
  });

  // ── KPI 2: 서명 완료 (Signed — percentage of sent) ─────────
  const signedCount = await prisma.document.count({
    where: {
      tenantId,
      status: "SIGNED",
      sentAt: { gte: monthStart, lt: monthEnd },
    },
  });

  const signedPercentage =
    sentCount > 0 ? Math.round((signedCount / sentCount) * 1000) / 10 : 0;

  // ── KPI 3: 서명 대기 (Pending signatures) ──────────────────
  const pendingCount = await prisma.document.count({
    where: {
      tenantId,
      status: { in: ["SENT", "VIEWED"] },
    },
  });

  // Delta: compare current week vs previous week pending
  const pendingThisWeek = await prisma.document.count({
    where: {
      tenantId,
      status: { in: ["SENT", "VIEWED"] },
      sentAt: { gte: weekStart },
    },
  });
  const pendingPrevWeek = await prisma.document.count({
    where: {
      tenantId,
      status: { in: ["SENT", "VIEWED"] },
      sentAt: { gte: prevWeekStart, lt: weekStart },
    },
  });
  const pendingDelta = pendingThisWeek - pendingPrevWeek;

  // ── KPI 4: 만료 예정 (Expiring within 7 days) ──────────────
  const expiringCount = await prisma.document.count({
    where: {
      tenantId,
      status: { in: ["SENT", "VIEWED"] },
      deadline: { gte: now, lte: sevenDaysLater },
    },
  });

  // Expiring delta (compare to previous 7-day window)
  const prevSevenDaysStart = new Date(now);
  prevSevenDaysStart.setDate(prevSevenDaysStart.getDate() - 7);
  const expiringPrev = await prisma.document.count({
    where: {
      tenantId,
      status: { in: ["SENT", "VIEWED", "EXPIRED"] },
      deadline: { gte: prevSevenDaysStart, lt: now },
    },
  });
  const expiringDelta = expiringCount - expiringPrev;

  return NextResponse.json({
    kpi: {
      sent: { count: sentCount },
      signed: { count: signedCount, percentage: signedPercentage },
      pending: { count: pendingCount, delta: pendingDelta },
      expiring: { count: expiringCount, delta: expiringDelta },
    },
  });
}

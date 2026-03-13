import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based for DB
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // ── Current month's payroll run ───────────────────────────
  const currentRun = await prisma.payrollRun.findUnique({
    where: {
      tenantId_year_month: { tenantId, year: currentYear, month: currentMonth },
    },
  });

  // ── Previous month's payroll run ──────────────────────────
  const prevRun = await prisma.payrollRun.findUnique({
    where: {
      tenantId_year_month: { tenantId, year: prevYear, month: prevMonth },
    },
  });

  // ── KPI 1: 급여 인원 (Total employees in current run) ────
  const totalEmployees = currentRun?.totalEmployees ?? 0;

  // ── KPI 2: 확정 완료율 (Confirmed payslips) ──────────────
  let confirmedCount = 0;
  let totalPayslips = 0;

  if (currentRun) {
    confirmedCount = await prisma.payslip.count({
      where: {
        tenantId,
        payrollRunId: currentRun.id,
        status: { in: ["CONFIRMED", "SENT"] },
      },
    });

    totalPayslips = await prisma.payslip.count({
      where: {
        tenantId,
        payrollRunId: currentRun.id,
      },
    });
  }

  const confirmedPercentage =
    totalPayslips > 0
      ? Math.round((confirmedCount / totalPayslips) * 1000) / 10
      : 0;

  // ── KPI 3: 미확정 건수 (Draft payslips) ──────────────────
  let unconfirmedCount = 0;
  let prevUnconfirmedCount = 0;

  if (currentRun) {
    unconfirmedCount = await prisma.payslip.count({
      where: {
        tenantId,
        payrollRunId: currentRun.id,
        status: "DRAFT",
      },
    });
  }

  if (prevRun) {
    prevUnconfirmedCount = await prisma.payslip.count({
      where: {
        tenantId,
        payrollRunId: prevRun.id,
        status: "DRAFT",
      },
    });
  }

  const unconfirmedDelta = unconfirmedCount - prevUnconfirmedCount;

  // ── KPI 4: 발송 완료 (Sent payslips) ─────────────────────
  let sentCount = 0;
  let prevSentCount = 0;

  if (currentRun) {
    sentCount = await prisma.payslip.count({
      where: {
        tenantId,
        payrollRunId: currentRun.id,
        status: "SENT",
      },
    });
  }

  if (prevRun) {
    prevSentCount = await prisma.payslip.count({
      where: {
        tenantId,
        payrollRunId: prevRun.id,
        status: "SENT",
      },
    });
  }

  const sentDelta = sentCount - prevSentCount;

  return NextResponse.json({
    kpi: {
      totalEmployees: { count: totalEmployees },
      confirmed: { count: confirmedCount, percentage: confirmedPercentage },
      unconfirmed: { count: unconfirmedCount, delta: unconfirmedDelta },
      sent: { count: sentCount, delta: sentDelta },
    },
  });
}

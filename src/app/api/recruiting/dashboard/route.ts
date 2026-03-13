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

  // ── Week boundaries ─────────────────────────────────────
  const dayOfWeek = now.getDay(); // 0=Sun
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const startOfPrevWeek = new Date(startOfWeek);
  startOfPrevWeek.setDate(startOfWeek.getDate() - 7);

  // ── KPI 1: 진행 중 채용 (Active open postings) ──────────
  const openPostings = await prisma.jobPosting.count({
    where: { tenantId, status: "OPEN" },
  });

  // ── KPI 2: 서류 접수 (Applications this week vs prev week) ─
  const applicationsThisWeek = await prisma.application.count({
    where: {
      tenantId,
      appliedAt: { gte: startOfWeek, lt: endOfWeek },
    },
  });

  const applicationsPrevWeek = await prisma.application.count({
    where: {
      tenantId,
      appliedAt: { gte: startOfPrevWeek, lt: startOfWeek },
    },
  });

  const applicationsDelta = applicationsThisWeek - applicationsPrevWeek;

  // ── KPI 3: 면접 예정 (Interviews scheduled this week) ────
  const interviewStatuses = [
    "FIRST_INTERVIEW",
    "SECOND_INTERVIEW",
    "FINAL",
  ] as const;

  const interviewsThisWeek = await prisma.application.count({
    where: {
      tenantId,
      status: { in: [...interviewStatuses] },
      updatedAt: { gte: startOfWeek, lt: endOfWeek },
    },
  });

  // ── KPI 4: 평균 채용 기간 (Avg days from posting open to hire) ─
  const hiredApplications = await prisma.application.findMany({
    where: {
      tenantId,
      status: "HIRED",
      hiredAt: { not: null },
    },
    include: {
      jobPosting: { select: { openDate: true } },
    },
  });

  let avgHiringDays = 0;
  if (hiredApplications.length > 0) {
    const totalDays = hiredApplications.reduce((sum, app) => {
      const openDate = app.jobPosting.openDate ?? app.createdAt;
      const hiredDate = app.hiredAt!;
      const diffMs = hiredDate.getTime() - openDate.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return sum + diffDays;
    }, 0);
    avgHiringDays = Math.round(totalDays / hiredApplications.length);
  }

  return NextResponse.json({
    kpi: {
      openPostings: { count: openPostings },
      applications: { count: applicationsThisWeek, delta: applicationsDelta },
      interviews: { count: interviewsThisWeek },
      avgHiringDays: { days: avgHiringDays },
    },
  });
}

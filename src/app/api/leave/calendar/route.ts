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
  const url = new URL(request.url);

  // Parse month from query: ?year=2026&month=3 (1-indexed)
  const now = new Date();
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()), 10);
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1), 10);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  // ── Leave events for the month ─────────────────────────────
  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      startDate: { lt: monthEnd },
      endDate: { gte: monthStart },
    },
    select: {
      startDate: true,
      endDate: true,
      policy: { select: { type: true, name: true } },
    },
  });

  // Collect days that have at least one leave event
  const eventDays = new Set<number>();
  for (const req of leaveRequests) {
    const start = new Date(Math.max(req.startDate.getTime(), monthStart.getTime()));
    const end = new Date(Math.min(req.endDate.getTime(), monthEnd.getTime() - 1));
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      if (cursor.getMonth() === month - 1 && cursor.getFullYear() === year) {
        eventDays.add(cursor.getDate());
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // ── Today's absences ───────────────────────────────────────
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const todayAbsences = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      startDate: { lte: now },
      endDate: { gte: today },
    },
    select: {
      employee: {
        select: {
          name: true,
          department: { select: { name: true } },
        },
      },
      policy: { select: { type: true, name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const absences = todayAbsences.map((r) => ({
    employeeName: r.employee.name,
    department: r.employee.department?.name ?? "-",
    leaveType: r.policy.name,
  }));

  return NextResponse.json({
    year,
    month,
    eventDays: Array.from(eventDays).sort((a, b) => a - b),
    todayAbsences: {
      count: absences.length,
      items: absences.slice(0, 3),
      remainingCount: Math.max(0, absences.length - 3),
    },
  });
}

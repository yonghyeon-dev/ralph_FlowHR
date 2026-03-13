import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface WeeklyTrend {
  week: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalCount: number;
  presentRate: number;
}

interface ExceptionSummaryItem {
  type: string;
  label: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface AttendanceInsightsData {
  totalRecords: number;
  avgPresentRate: number;
  totalExceptions: number;
  pendingExceptions: number;
  weeklyTrend: WeeklyTrend[];
  exceptionSummary: ExceptionSummaryItem[];
}

function getWeekLabel(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const weekNum = Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
  return `W${weekNum}`;
}

function getWeekKey(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const weekNum = Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

const EXCEPTION_LABELS: Record<string, string> = {
  CORRECTION: "근태 정정",
  OVERTIME: "초과근무",
  BUSINESS_TRIP: "출장",
  REMOTE_WORK: "재택근무",
};

const EXCEPTION_TYPES = ["CORRECTION", "OVERTIME", "BUSINESS_TRIP", "REMOTE_WORK"];

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const [records, exceptions] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        date: { gte: eightWeeksAgo },
      },
    }),
    prisma.attendanceException.findMany({
      where: { tenantId },
    }),
  ]);

  // Weekly trend (last 8 weeks)
  const weekMap = new Map<
    string,
    { label: string; present: number; absent: number; late: number; total: number }
  >();

  for (const rec of records) {
    const key = getWeekKey(rec.date);
    const label = getWeekLabel(rec.date);
    const entry = weekMap.get(key) ?? {
      label,
      present: 0,
      absent: 0,
      late: 0,
      total: 0,
    };
    entry.total++;
    if (rec.status === "PRESENT" || rec.status === "HALF_DAY") {
      entry.present++;
    } else if (rec.status === "ABSENT") {
      entry.absent++;
    } else if (rec.status === "LATE" || rec.status === "EARLY_LEAVE") {
      entry.late++;
    }
    weekMap.set(key, entry);
  }

  const weeklyTrend: WeeklyTrend[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([, w]) => ({
      week: w.label,
      presentCount: w.present,
      absentCount: w.absent,
      lateCount: w.late,
      totalCount: w.total,
      presentRate: w.total > 0 ? Math.round((w.present / w.total) * 100) : 0,
    }));

  // Exception summary
  const exTypeCounts = new Map<string, { total: number; pending: number; approved: number; rejected: number }>();
  for (const typ of EXCEPTION_TYPES) {
    exTypeCounts.set(typ, { total: 0, pending: 0, approved: 0, rejected: 0 });
  }

  for (const ex of exceptions) {
    const entry = exTypeCounts.get(ex.type) ?? { total: 0, pending: 0, approved: 0, rejected: 0 };
    entry.total++;
    if (ex.status === "PENDING") entry.pending++;
    else if (ex.status === "APPROVED") entry.approved++;
    else if (ex.status === "REJECTED") entry.rejected++;
    exTypeCounts.set(ex.type, entry);
  }

  const exceptionSummary: ExceptionSummaryItem[] = EXCEPTION_TYPES.map((type) => {
    const counts = exTypeCounts.get(type)!;
    return {
      type,
      label: EXCEPTION_LABELS[type] ?? type,
      ...counts,
    };
  });

  const totalExceptions = exceptions.length;
  const pendingExceptions = exceptions.filter((e) => e.status === "PENDING").length;

  const totalPresent = records.filter(
    (r) => r.status === "PRESENT" || r.status === "HALF_DAY"
  ).length;
  const avgPresentRate =
    records.length > 0 ? Math.round((totalPresent / records.length) * 100) : 0;

  const data: AttendanceInsightsData = {
    totalRecords: records.length,
    avgPresentRate,
    totalExceptions,
    pendingExceptions,
    weeklyTrend,
    exceptionSummary,
  };

  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { Prisma, AttendanceStatus } from "@prisma/client";

const VALID_STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EARLY_LEAVE",
  "HALF_DAY",
];

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId;
  const { searchParams } = request.nextUrl;

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const sortKey = searchParams.get("sortKey") ?? "date";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)),
  );

  const where: Prisma.AttendanceRecordWhereInput = {
    tenantId,
  };

  if (search) {
    where.employee = {
      name: { contains: search, mode: "insensitive" },
    };
  }

  if (status && VALID_STATUSES.includes(status as AttendanceStatus)) {
    where.status = status as AttendanceStatus;
  }

  // Build orderBy based on sortKey
  type OrderByType = Prisma.AttendanceRecordOrderByWithRelationInput;
  let orderBy: OrderByType;

  switch (sortKey) {
    case "name":
      orderBy = { employee: { name: sortDir } };
      break;
    case "checkIn":
      orderBy = { checkIn: sortDir };
      break;
    case "checkOut":
      orderBy = { checkOut: sortDir };
      break;
    case "workMinutes":
      orderBy = { workMinutes: sortDir };
      break;
    case "status":
      orderBy = { status: sortDir };
      break;
    default:
      orderBy = { date: sortDir };
  }

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  const data = records.map((r) => {
    const checkInTime = r.checkIn
      ? new Date(r.checkIn).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : null;
    const checkOutTime = r.checkOut
      ? new Date(r.checkOut).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : null;

    let workDisplay: string;
    if (r.workMinutes !== null && r.workMinutes > 0) {
      const hours = Math.floor(r.workMinutes / 60);
      const mins = r.workMinutes % 60;
      workDisplay = `${hours}h ${mins}m`;
    } else if (r.checkIn && !r.checkOut) {
      workDisplay = "진행 중";
    } else {
      workDisplay = "—";
    }

    return {
      id: r.id,
      employeeName: r.employee.name,
      department: r.employee.department?.name ?? "—",
      date: new Date(r.date).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      checkIn: checkInTime,
      checkOut: checkOutTime,
      workDisplay,
      status: r.status,
      overtime: r.overtime,
    };
  });

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

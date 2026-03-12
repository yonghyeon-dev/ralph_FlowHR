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
  const { searchParams } = request.nextUrl;

  // Parse week start date from query param (ISO string), default to current week's Monday
  const weekParam = searchParams.get("weekStart");
  let weekStart: Date;

  if (weekParam) {
    weekStart = new Date(weekParam);
    weekStart.setHours(0, 0, 0, 0);
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 5); // Monday to Friday (5 days)

  // Fetch shift assignments for the week with employee and shift details
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      tenantId,
      startDate: { lte: weekEnd },
      OR: [
        { endDate: null },
        { endDate: { gte: weekStart } },
      ],
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
        },
      },
      shift: {
        select: {
          id: true,
          name: true,
          type: true,
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: [
      { employee: { department: { name: "asc" } } },
      { employee: { name: "asc" } },
    ],
  });

  // Group by department, then by employee
  const departmentMap = new Map<
    string,
    {
      id: string;
      name: string;
      employees: Map<
        string,
        {
          id: string;
          name: string;
          shifts: { shiftName: string; shiftType: string }[];
        }
      >;
    }
  >();

  // Generate weekday dates (Mon-Fri)
  const weekDays: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d.toISOString().split("T")[0]);
  }

  for (const assignment of assignments) {
    const dept = assignment.employee.department;
    if (!dept) continue;

    if (!departmentMap.has(dept.id)) {
      departmentMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        employees: new Map(),
      });
    }

    const deptEntry = departmentMap.get(dept.id)!;
    const empId = assignment.employee.id;

    if (!deptEntry.employees.has(empId)) {
      // Initialize with empty shifts for each weekday
      deptEntry.employees.set(empId, {
        id: empId,
        name: assignment.employee.name,
        shifts: weekDays.map(() => ({ shiftName: "", shiftType: "" })),
      });
    }

    const empEntry = deptEntry.employees.get(empId)!;

    // Fill in shift for each applicable day
    for (let i = 0; i < weekDays.length; i++) {
      const dayDate = new Date(weekDays[i]);
      const assignStart = new Date(assignment.startDate);
      assignStart.setHours(0, 0, 0, 0);
      const assignEnd = assignment.endDate
        ? new Date(assignment.endDate)
        : null;
      if (assignEnd) assignEnd.setHours(23, 59, 59, 999);

      if (
        dayDate >= assignStart &&
        (assignEnd === null || dayDate <= assignEnd)
      ) {
        empEntry.shifts[i] = {
          shiftName: assignment.shift.name,
          shiftType: assignment.shift.type,
        };
      }
    }
  }

  // Convert to array format
  const departments = Array.from(departmentMap.values()).map((dept) => ({
    id: dept.id,
    name: dept.name,
    employees: Array.from(dept.employees.values()),
  }));

  // Format week days with day names
  const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
  const formattedDays = weekDays.map((dateStr) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dayName = DAY_NAMES[d.getDay()];
    return { date: dateStr, label: `${dayName} (${month}/${day})` };
  });

  return NextResponse.json({
    weekStart: weekStart.toISOString().split("T")[0],
    weekDays: formattedDays,
    departments,
  });
}

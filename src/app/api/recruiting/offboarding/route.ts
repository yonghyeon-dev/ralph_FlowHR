import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// ─── GET: 오프보딩 태스크 목록 (직원별 그룹핑) ──────────────────
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const tasks = await prisma.offboardingTask.findMany({
    where: { tenantId },
    orderBy: [{ employeeId: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      employeeId: true,
      title: true,
      description: true,
      category: true,
      status: true,
      dueDate: true,
      completedAt: true,
      sortOrder: true,
      employee: {
        select: {
          id: true,
          name: true,
          resignDate: true,
          department: { select: { name: true } },
          position: { select: { name: true } },
        },
      },
    },
  });

  // Group by employee
  const grouped: Record<
    string,
    {
      employee: {
        id: string;
        name: string;
        department: string;
        position: string;
        resignDate: string | null;
      };
      tasks: Array<{
        id: string;
        title: string;
        description: string | null;
        category: string;
        status: string;
        dueDate: string | null;
        completedAt: string | null;
        sortOrder: number;
      }>;
    }
  > = {};

  for (const task of tasks) {
    const empId = task.employeeId;
    if (!grouped[empId]) {
      grouped[empId] = {
        employee: {
          id: task.employee.id,
          name: task.employee.name,
          department: task.employee.department?.name ?? "-",
          position: task.employee.position?.name ?? "-",
          resignDate: task.employee.resignDate
            ? task.employee.resignDate.toISOString()
            : null,
        },
        tasks: [],
      };
    }
    grouped[empId].tasks.push({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      sortOrder: task.sortOrder,
    });
  }

  const employees = Object.values(grouped);

  return NextResponse.json({ employees });
}

// ─── PATCH: 오프보딩 태스크 상태 변경 ──────────────────────────
export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const body = await request.json();
  const { taskId, status } = body as { taskId: string; status: string };

  if (!taskId || !status) {
    return NextResponse.json(
      { error: "taskId and status are required" },
      { status: 400 },
    );
  }

  const validStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 },
    );
  }

  const existing = await prisma.offboardingTask.findFirst({
    where: { id: taskId, tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "COMPLETED") {
    updateData.completedAt = new Date();
  } else {
    updateData.completedAt = null;
  }

  const updated = await prisma.offboardingTask.update({
    where: { id: taskId },
    data: updateData,
  });

  return NextResponse.json({ task: updated });
}

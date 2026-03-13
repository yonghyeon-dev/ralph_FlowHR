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

  // ── Active evaluation cycle ────────────────────────────
  const activeCycle = await prisma.evalCycle.findFirst({
    where: { tenantId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  // ── KPI 1: 목표 설정 완료율 (emphasis) ─────────────────
  const totalEmployees = await prisma.employee.count({
    where: { tenantId, status: "ACTIVE" },
  });

  let employeesWithGoals = 0;
  if (activeCycle) {
    const result = await prisma.goal.groupBy({
      by: ["employeeId"],
      where: { tenantId, cycleId: activeCycle.id },
    });
    employeesWithGoals = result.length;
  }

  const goalCompletionRate =
    totalEmployees > 0
      ? Math.round((employeesWithGoals / totalEmployees) * 100)
      : 0;

  // ── KPI 2: 평가 중 (진행 중인 평가 건수) ──────────────
  const evaluationsInProgress = activeCycle
    ? await prisma.evaluation.count({
        where: {
          tenantId,
          cycleId: activeCycle.id,
          status: { in: ["SELF_REVIEW", "PEER_REVIEW", "MANAGER_REVIEW"] },
        },
      })
    : 0;

  // ── KPI 3: 1:1 예정 (이번 주 예정) ────────────────────
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const scheduledOneOnOnes = await prisma.oneOnOne.count({
    where: {
      tenantId,
      status: "SCHEDULED",
      scheduledAt: { gte: weekStart, lt: weekEnd },
    },
  });

  // ── KPI 4: 미설정 (목표 미입력 인원) ──────────────────
  const notStartedGoals = activeCycle
    ? await prisma.goal.count({
        where: {
          tenantId,
          cycleId: activeCycle.id,
          status: "NOT_STARTED",
        },
      })
    : 0;

  // ── 부서별 목표 설정률 ────────────────────────────────
  const departments = await prisma.department.findMany({
    where: { tenantId, parentId: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const deptGoalRates: { name: string; value: number }[] = [];

  if (activeCycle) {
    for (const dept of departments) {
      const deptEmployeeCount = await prisma.employee.count({
        where: { tenantId, departmentId: dept.id, status: "ACTIVE" },
      });

      if (deptEmployeeCount === 0) continue;

      const deptEmployeesWithGoals = await prisma.goal.groupBy({
        by: ["employeeId"],
        where: {
          tenantId,
          cycleId: activeCycle.id,
          employee: { departmentId: dept.id },
        },
      });

      const rate =
        deptEmployeeCount > 0
          ? Math.round(
              (deptEmployeesWithGoals.length / deptEmployeeCount) * 100
            )
          : 0;

      deptGoalRates.push({ name: dept.name, value: rate });
    }
  }

  deptGoalRates.sort((a, b) => b.value - a.value);

  // ── Active Cycle info ─────────────────────────────────
  let activeCycleInfo = null;
  if (activeCycle) {
    const completedEvals = await prisma.evaluation.count({
      where: {
        tenantId,
        cycleId: activeCycle.id,
        status: "COMPLETED",
      },
    });
    const totalEvals = await prisma.evaluation.count({
      where: { tenantId, cycleId: activeCycle.id },
    });
    const completionRate =
      totalEvals > 0 ? Math.round((completedEvals / totalEvals) * 100) : 0;

    activeCycleInfo = {
      name: activeCycle.name,
      startDate: activeCycle.startDate.toISOString(),
      endDate: activeCycle.endDate.toISOString(),
      type: activeCycle.type,
      status: activeCycle.status,
      completionRate,
    };
  }

  return NextResponse.json({
    kpi: {
      goalCompletion: {
        rate: goalCompletionRate,
        completed: employeesWithGoals,
        total: totalEmployees,
      },
      evaluationsInProgress: { count: evaluationsInProgress },
      scheduledOneOnOnes: { count: scheduledOneOnOnes },
      notStartedGoals: { count: notStartedGoals },
    },
    deptGoalRates,
    activeCycle: activeCycleInfo,
  });
}

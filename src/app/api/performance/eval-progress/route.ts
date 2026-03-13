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
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? "10"))
  );

  // ── Active evaluation cycle ────────────────────────────
  const activeCycle = await prisma.evalCycle.findFirst({
    where: { tenantId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeCycle) {
    return NextResponse.json({
      cycle: null,
      evaluations: [],
      total: 0,
      page,
      pageSize,
      completionRate: 0,
    });
  }

  // ── Total evaluations & completion ─────────────────────
  const totalEvals = await prisma.evaluation.count({
    where: { tenantId, cycleId: activeCycle.id },
  });

  const completedEvals = await prisma.evaluation.count({
    where: { tenantId, cycleId: activeCycle.id, status: "COMPLETED" },
  });

  const completionRate =
    totalEvals > 0 ? Math.round((completedEvals / totalEvals) * 100) : 0;

  // ── Paginated evaluations with employee + department ───
  const evaluations = await prisma.evaluation.findMany({
    where: { tenantId, cycleId: activeCycle.id },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // ── Map evaluation status to stage progress ────────────
  const statusOrder: Record<string, number> = {
    NOT_STARTED: 0,
    SELF_REVIEW: 1,
    PEER_REVIEW: 2,
    MANAGER_REVIEW: 3,
    COMPLETED: 4,
  };

  const rows = evaluations.map((ev) => {
    const order = statusOrder[ev.status] ?? 0;

    // Self stage: completed if past SELF_REVIEW, in-progress if at SELF_REVIEW
    const selfStage =
      order > 1 ? "completed" : order === 1 ? "in_progress" : "not_started";
    // Peer stage: completed if past PEER_REVIEW, in-progress if at PEER_REVIEW
    const peerStage =
      order > 2 ? "completed" : order === 2 ? "in_progress" : "not_started";
    // Manager stage: completed if COMPLETED, in-progress if at MANAGER_REVIEW
    const managerStage =
      order > 3 ? "completed" : order === 3 ? "in_progress" : "not_started";

    const completedStages = [selfStage, peerStage, managerStage].filter(
      (s) => s === "completed"
    ).length;

    return {
      id: ev.id,
      employeeId: ev.employee.id,
      name: ev.employee.name,
      department: ev.employee.department?.name ?? "-",
      status: ev.status,
      selfStage,
      peerStage,
      managerStage,
      completedStages,
    };
  });

  return NextResponse.json({
    cycle: {
      id: activeCycle.id,
      name: activeCycle.name,
    },
    evaluations: rows,
    total: totalEvals,
    page,
    pageSize,
    completionRate,
  });
}

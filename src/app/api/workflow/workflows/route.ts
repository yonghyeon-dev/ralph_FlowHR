import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// ─── GET: 워크플로우 목록 조회 ─────────────────────────────
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const workflows = await prisma.workflow.findMany({
    where: { tenantId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      triggerType: true,
      status: true,
      steps: true,
      conditions: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { approvalRequests: true } },
    },
  });

  return NextResponse.json({ workflows });
}

// ─── POST: 워크플로우 생성 ──────────────────────────────────
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const body = await request.json();
  const { name, description, triggerType, status, steps, conditions } = body;

  if (!name || !triggerType) {
    return NextResponse.json(
      { error: "name, triggerType은 필수입니다" },
      { status: 400 },
    );
  }

  const validTriggers = ["OVERTIME", "LEAVE", "EXPENSE", "SALARY_CHANGE"];
  if (!validTriggers.includes(triggerType)) {
    return NextResponse.json(
      { error: "유효하지 않은 트리거 유형입니다" },
      { status: 400 },
    );
  }

  // 동일 tenant + name 중복 검사
  const existing = await prisma.workflow.findUnique({
    where: { tenantId_name: { tenantId, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 동일한 이름의 워크플로우가 존재합니다" },
      { status: 409 },
    );
  }

  const workflow = await prisma.workflow.create({
    data: {
      tenantId,
      name,
      description: description || null,
      triggerType,
      status: status || "DRAFT",
      steps: steps || [],
      conditions: conditions || null,
    },
  });

  return NextResponse.json({ workflow }, { status: 201 });
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── GET: 워크플로우 상세 조회 ──────────────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const workflow = await prisma.workflow.findFirst({
    where: { id, tenantId },
    include: {
      _count: { select: { approvalRequests: true } },
    },
  });

  if (!workflow) {
    return NextResponse.json(
      { error: "워크플로우를 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  return NextResponse.json({ workflow });
}

// ─── PATCH: 워크플로우 수정 ─────────────────────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.workflow.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "워크플로우를 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    // 이름 변경 시 중복 검사
    if (body.name !== existing.name) {
      const dup = await prisma.workflow.findUnique({
        where: { tenantId_name: { tenantId, name: body.name } },
      });
      if (dup) {
        return NextResponse.json(
          { error: "이미 동일한 이름의 워크플로우가 존재합니다" },
          { status: 409 },
        );
      }
    }
    updateData.name = body.name;
  }
  if (body.description !== undefined) updateData.description = body.description;
  if (body.triggerType !== undefined) updateData.triggerType = body.triggerType;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.steps !== undefined) updateData.steps = body.steps;
  if (body.conditions !== undefined) updateData.conditions = body.conditions;

  const workflow = await prisma.workflow.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ workflow });
}

// ─── DELETE: 워크플로우 삭제 ────────────────────────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.workflow.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { approvalRequests: true } } },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "워크플로우를 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  if (existing._count.approvalRequests > 0) {
    return NextResponse.json(
      { error: "연결된 결재 요청이 있어 삭제할 수 없습니다" },
      { status: 409 },
    );
  }

  await prisma.workflow.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

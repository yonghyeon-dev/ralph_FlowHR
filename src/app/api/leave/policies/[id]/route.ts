import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── PATCH: 휴가 정책 수정 ──────────────────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.leavePolicy.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "정책을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { name, description, defaultDays, carryOverLimit, requiresApproval, isActive } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description || null;
  if (defaultDays !== undefined) updateData.defaultDays = Number(defaultDays);
  if (carryOverLimit !== undefined) updateData.carryOverLimit = Number(carryOverLimit);
  if (requiresApproval !== undefined) updateData.requiresApproval = requiresApproval;
  if (isActive !== undefined) updateData.isActive = isActive;

  const updated = await prisma.leavePolicy.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ policy: updated });
}

// ─── DELETE: 휴가 정책 비활성화 ─────────────────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.leavePolicy.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "정책을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  // 소프트 삭제: isActive = false
  const updated = await prisma.leavePolicy.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ policy: updated });
}

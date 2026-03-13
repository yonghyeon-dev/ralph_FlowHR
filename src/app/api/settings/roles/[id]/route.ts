import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── PATCH: 역할 수정 ──────────────────────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.role.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "역할을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { name, description, permissions } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!name.trim()) {
      return NextResponse.json(
        { error: "역할명은 필수입니다" },
        { status: 400 },
      );
    }
    // 이름 변경 시 중복 검사
    if (name.trim() !== existing.name) {
      const dup = await prisma.role.findUnique({
        where: { tenantId_name: { tenantId, name: name.trim() } },
      });
      if (dup) {
        return NextResponse.json(
          { error: "이미 동일한 이름의 역할이 존재합니다" },
          { status: 409 },
        );
      }
    }
    updateData.name = name.trim();
  }
  if (description !== undefined) updateData.description = description || null;
  if (permissions !== undefined) updateData.permissions = permissions;

  const updated = await prisma.role.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ role: updated });
}

// ─── DELETE: 역할 삭제 ──────────────────────────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.role.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "역할을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  if (existing.isSystem) {
    return NextResponse.json(
      { error: "시스템 역할은 삭제할 수 없습니다" },
      { status: 403 },
    );
  }

  // 사용자가 할당된 역할인지 확인
  const userCount = await prisma.user.count({
    where: { roleId: id },
  });
  if (userCount > 0) {
    return NextResponse.json(
      { error: `${userCount}명의 사용자가 이 역할을 사용 중입니다. 먼저 사용자의 역할을 변경해주세요.` },
      { status: 409 },
    );
  }

  await prisma.role.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

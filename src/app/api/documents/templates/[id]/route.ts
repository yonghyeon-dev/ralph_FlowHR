import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── PATCH: 문서 템플릿 수정 ────────────────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.documentTemplate.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "템플릿을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { name, description, category, content, version, isActive } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (category !== undefined) updateData.category = category;
  if (content !== undefined) updateData.content = content;
  if (version !== undefined) updateData.version = version.trim();
  if (isActive !== undefined) updateData.isActive = isActive;

  const updated = await prisma.documentTemplate.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ template: updated });
}

// ─── DELETE: 문서 템플릿 비활성화 ────────────────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.documentTemplate.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "템플릿을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  // 소프트 삭제: isActive = false
  const updated = await prisma.documentTemplate.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ template: updated });
}

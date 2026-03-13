import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── PATCH: 채용 공고 수정 ──────────────────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.jobPosting.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "공고를 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const {
    title,
    departmentId,
    positionId,
    hiringManagerId,
    status,
    description,
    requirements,
    location,
    employmentType,
    headcount,
    openDate,
    closeDate,
  } = body;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title.trim();
  if (departmentId !== undefined) updateData.departmentId = departmentId || null;
  if (positionId !== undefined) updateData.positionId = positionId || null;
  if (hiringManagerId !== undefined) updateData.hiringManagerId = hiringManagerId;
  if (status !== undefined) updateData.status = status;
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (requirements !== undefined) updateData.requirements = requirements?.trim() || null;
  if (location !== undefined) updateData.location = location?.trim() || null;
  if (employmentType !== undefined) updateData.employmentType = employmentType;
  if (headcount !== undefined) updateData.headcount = Number(headcount);
  if (openDate !== undefined) updateData.openDate = openDate ? new Date(openDate) : null;
  if (closeDate !== undefined) updateData.closeDate = closeDate ? new Date(closeDate) : null;

  const updated = await prisma.jobPosting.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ posting: updated });
}

// ─── DELETE: 채용 공고 삭제 (CANCELLED 상태로 변경) ──────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.jobPosting.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "공고를 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const updated = await prisma.jobPosting.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ posting: updated });
}

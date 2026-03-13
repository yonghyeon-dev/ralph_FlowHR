import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = [
  "APPLIED",
  "SCREENING",
  "FIRST_INTERVIEW",
  "SECOND_INTERVIEW",
  "FINAL",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
];

// ─── PATCH: 지원자 상태/스테이지 변경 (파이프라인 드래그앤드롭) ──
export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.application.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "지원자를 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { status, stage, rating, notes } = body;

  const updateData: Record<string, unknown> = {};

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "유효하지 않은 지원 상태입니다" },
        { status: 400 },
      );
    }
    updateData.status = status;

    if (status === "HIRED") {
      updateData.hiredAt = new Date();
    } else if (status === "REJECTED") {
      updateData.rejectedAt = new Date();
    }
  }

  if (stage !== undefined) {
    updateData.stage = Number(stage);
  }

  if (rating !== undefined) {
    updateData.rating = rating ? Number(rating) : null;
  }

  if (notes !== undefined) {
    updateData.notes = notes?.trim() || null;
  }

  const updated = await prisma.application.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ application: updated });
}

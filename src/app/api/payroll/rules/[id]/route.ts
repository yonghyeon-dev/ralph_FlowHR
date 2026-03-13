import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── PATCH: 급여 규칙 수정 ──────────────────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { id } = await context.params;

  const existing = await prisma.payrollRule.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "규칙을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { name, description, formula, rate, isActive } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description || null;
  if (formula !== undefined) updateData.formula = formula;
  if (rate !== undefined) updateData.rate = rate !== null ? Number(rate) : null;
  if (isActive !== undefined) updateData.isActive = isActive;

  const updated = await prisma.payrollRule.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ rule: updated });
}
